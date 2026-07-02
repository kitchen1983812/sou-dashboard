/**
 * 園リマインドメール 月次自動送信スクリプト
 *
 * 環境変数(GitHub Actions Secrets):
 *   GOOGLE_SERVICE_ACCOUNT_JSON  - service account JSON (raw string)
 *   GOOGLE_SHEET_ID              - 全データ用Sheets (集計元)
 *   NOTIFY_SHEET_ID              - 園マスタ_通知 用Sheets (1JcmgUo0kGim_5ojtE8C3Mhn8IXL4Dmh7LMuLFJi5ygc)
 *   SMTP_HOST                    - SMTPサーバー (例: sou-kidscare.sakura.ne.jp)
 *   SMTP_PORT                    - SMTPポート (587=STARTTLS / 465=SSL)
 *   SMTP_SECURE                  - "true"=SSL(465) / "false"=STARTTLS(587)
 *   SMTP_USER                    - SMTP認証ユーザー (例: no-reply@sou-kidscare.co.jp)
 *   SMTP_PASSWORD                - SMTPパスワード
 *   FROM_NAME                    - 表示名 (デフォルト: SOUキッズケア本社事務局)
 *   TEST_MODE                    - "true" だと園マスタの送信先を無視し TEST_RECIPIENT のみに送信
 *   TEST_RECIPIENT               - TEST_MODE時の宛先 (例: kitchen812@gmail.com)
 *   DRY_RUN                      - "true" だと送信せずログのみ
 *
 * 実行: node scripts/send-monthly-reminder.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";
import nodemailer from "nodemailer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ローカル実行用: .env と documents/*.json から認証情報を自動読み込み
function loadLocalEnv() {
	// SOU プロジェクトルートを推定: scripts/ → repositories/ax-dashboard/ → ../../ = SOU root
	const souRoot = path.resolve(__dirname, "../../..");
	const envPath = path.join(souRoot, ".env");
	if (fs.existsSync(envPath)) {
		const content = fs.readFileSync(envPath, "utf-8");
		for (const line of content.split(/\r?\n/)) {
			if (line.startsWith("#") || !line.includes("=")) continue;
			const idx = line.indexOf("=");
			const k = line.slice(0, idx).trim();
			const v = line
				.slice(idx + 1)
				.trim()
				.replace(/^['"]|['"]$/g, "");
			if (!process.env[k]) process.env[k] = v;
		}
	}
	if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
		const docsDir = path.join(souRoot, "documents");
		if (fs.existsSync(docsDir)) {
			for (const f of fs.readdirSync(docsDir)) {
				if (!f.endsWith(".json")) continue;
				try {
					const c = JSON.parse(
						fs.readFileSync(path.join(docsDir, f), "utf-8"),
					);
					if (c.type === "service_account") {
						process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify(c);
						break;
					}
				} catch {}
			}
		}
	}
}
loadLocalEnv();

const SHEET_ID_INQUIRIES = process.env.GOOGLE_SHEET_ID;
const SHEET_ID_NOTIFY = process.env.NOTIFY_SHEET_ID || "1JcmgUo0kGim_5ojtE8C3Mhn8IXL4Dmh7LMuLFJi5ygc";
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? "587", 10);
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const FROM_NAME = process.env.FROM_NAME ?? "SOUキッズケア本社事務局";
// 送信者メールアドレス (Resend では SMTP_USER='resend' なので別途指定が必要)
const FROM_ADDRESS = process.env.FROM_ADDRESS || SMTP_USER;
const TEST_MODE = process.env.TEST_MODE === "true";
const TEST_RECIPIENT = process.env.TEST_RECIPIENT;
const DRY_RUN = process.env.DRY_RUN === "true";
// 各パターン(A/B/C)から1園ずつ計3通のみ送信。テンプレ確認用
const SAMPLE_MODE = process.env.SAMPLE_MODE === "true";
// MD出力モード: SMTP接続せず reports/email-preview-YYYY-MM-DD.md を生成
const PREVIEW_MD = process.env.PREVIEW_MD === "true";
// ブランド絞り込み (部分一致): 例 "POP" "ことり" "フェリーチェ"
const BRAND_FILTER = (process.env.BRAND_FILTER ?? "").trim();
// 営業日判定スキップ (workflow_dispatch時) - 手動実行は強制
const FORCE_RUN = process.env.FORCE_RUN === "true";

// シートURL生成用 (NOTIFY_SHEET_ID と同じ Sheets内の各園worksheet を参照)
function buildSheetUrl(spreadsheetId, gid) {
	return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${gid}#gid=${gid}`;
}

// 園マスタの園名 → worksheet名 の表記ゆれマッピング
// (柏II/座間II は運用名・worksheet側は柏/座間、ふぇりーちぇ括弧の全半角差)
const NURSERY_TO_WORKSHEET = {
	柏II園: "柏園",
	座間II園: "座間園",
	"ふぇりーちぇほいくえん(東千葉園)": "ふぇりーちぇほいくえん（東千葉園）",
};

const DECIDED_STATUSES = new Set([
	"入園",
	"辞退",
	"連絡つかない",
	"諸事情により受入不可",
	"重複",
]);
const STATUS_GUIDED = "ご案内済";
const STATUS_UNANSWERED = "未対応";
const STATUS_INPROGRESS = "対応中";
const STATUS_ENROLLED = "入園";

function authClient() {
	const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
	if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON が未設定");
	const creds = JSON.parse(raw);
	return new google.auth.JWT({
		email: creds.client_email,
		key: creds.private_key.replace(/\\n/g, "\n"),
		scopes: ["https://www.googleapis.com/auth/spreadsheets"],
	});
}

async function getSheetValues(auth, spreadsheetId, range) {
	const sheets = google.sheets({ version: "v4", auth });
	const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
	return res.data.values ?? [];
}

// worksheet名 → gid のマップを取得 (各園個別シートURLへのリンク用)
async function getWorksheetMap(auth, spreadsheetId) {
	const sheets = google.sheets({ version: "v4", auth });
	const res = await sheets.spreadsheets.get({ spreadsheetId });
	const map = {};
	for (const s of res.data.sheets ?? []) {
		map[s.properties.title] = s.properties.sheetId;
	}
	return map;
}

// 園名 → 該当worksheetのURL (該当なしなら null)
function nurseryUrl(nurseryName, worksheetMap, spreadsheetId) {
	const wsName = NURSERY_TO_WORKSHEET[nurseryName] ?? nurseryName;
	const gid = worksheetMap[wsName];
	if (gid === undefined) return null;
	return buildSheetUrl(spreadsheetId, gid);
}

// HTML エスケープ
function esc(s) {
	return String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

async function appendSheetRow(auth, spreadsheetId, range, row) {
	const sheets = google.sheets({ version: "v4", auth });
	await sheets.spreadsheets.values.append({
		spreadsheetId,
		range,
		valueInputOption: "USER_ENTERED",
		requestBody: { values: [row] },
	});
}

function parseDate(s) {
	if (!s) return null;
	const v = String(s).trim().split(" ")[0];
	for (const fmt of [
		/^(\d{4})-(\d{1,2})-(\d{1,2})$/,
		/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
	]) {
		const m = v.match(fmt);
		if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	}
	return null;
}

function getCurrentFY(date) {
	return date.getMonth() < 3 ? date.getFullYear() - 1 : date.getFullYear();
}

// ブランド → 配信対象の営業日番号 (第N営業日)
// Resend無料プランの1日100件上限を回避するため2日に分けて配信 (2026-08 開始)
// 第1営業日: フェリーチェ 25園 × 3宛先 = 75件
// 第2営業日: わくわく(POP) 6園 + ことり(give&give) 5園 × 3宛先 = 33件
const BRAND_TO_BUSINESS_DAY = {
	フェリーチェ: 1,
	"わくわく保育園(POP)": 2,
	"ことり保育園(give&give)": 2,
};
const DEFAULT_BUSINESS_DAY = 1; // マスタに未登録のブランドは第1営業日扱い

// 当月の第N営業日の日付を返す (N=1 が第1営業日)
// 平日カウント + 元旦のみハードコード除外
function getNthBusinessDayOfMonthJST(now, n) {
	const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
	const year = jst.getUTCFullYear();
	const month = jst.getUTCMonth();
	let d = new Date(Date.UTC(year, month, 1));
	let count = 0;
	while (count < n) {
		const day = d.getUTCDate();
		const dow = d.getUTCDay();
		const isNewYearsDay = month === 0 && day === 1;
		const isWeekend = dow === 0 || dow === 6;
		if (!isWeekend && !isNewYearsDay) {
			count += 1;
			if (count === n) break;
		}
		d.setUTCDate(day + 1);
	}
	return d.getUTCDate();
}

// 今日が当月の第何営業日か (営業日でなければ null)
function getBusinessDayNumberJST(now) {
	const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
	const year = jst.getUTCFullYear();
	const month = jst.getUTCMonth();
	const today = jst.getUTCDate();
	let count = 0;
	for (let day = 1; day <= today; day += 1) {
		const d = new Date(Date.UTC(year, month, day));
		const dow = d.getUTCDay();
		const isNewYearsDay = month === 0 && day === 1;
		const isWeekend = dow === 0 || dow === 6;
		if (!isWeekend && !isNewYearsDay) count += 1;
	}
	if (count === 0) return null; // 元旦・週末など営業日でない
	const d = new Date(Date.UTC(year, month, today));
	const dow = d.getUTCDay();
	const isNewYearsDay = month === 0 && today === 1;
	if (dow === 0 || dow === 6 || isNewYearsDay) return null;
	return count;
}

// 後方互換: 第1営業日判定 (呼出元の削除まで維持)
function getFirstBusinessDayOfMonthJST(now) {
	return getNthBusinessDayOfMonthJST(now, 1);
}
function isFirstBusinessDayJST(now) {
	return getBusinessDayNumberJST(now) === 1;
}

function computeNurseryStats(inquiries, fyStart, fyEnd) {
	const map = new Map();
	const now = new Date();
	for (const inq of inquiries) {
		const d = parseDate(inq.postDate);
		if (!d) continue;
		if (d < fyStart || d > fyEnd) continue;
		const nursery = (inq.sheetName || inq.nursery || "(不明)").trim();
		if (!nursery) continue;
		if (!map.has(nursery)) {
			map.set(nursery, {
				nursery,
				total: 0,
				decided: 0,
				pending: 0,
				guided: 0,
				unanswered: 0,
				inProgress: 0,
				enrolled: 0,
				guidedStall90: 0,
			});
		}
		const row = map.get(nursery);
		row.total++;
		const s = (inq.status || "").trim();
		if (DECIDED_STATUSES.has(s)) row.decided++;
		else row.pending++;
		if (s === STATUS_GUIDED) {
			row.guided++;
			const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
			if (days > 90) row.guidedStall90++;
		}
		if (s === STATUS_UNANSWERED || !s) row.unanswered++;
		if (s === STATUS_INPROGRESS) row.inProgress++;
		if (s === STATUS_ENROLLED) row.enrolled++;
	}
	return Array.from(map.values());
}

// 必須対応 = 未対応(空欄含む) + 対応中。社長方針: これを主眼に、ご案内済は変化時のみ更新
function determinePattern(row) {
	const mustHandle = row.unanswered + row.inProgress;
	if (mustHandle === 0) return "C"; // 必須対応なし → 御礼のみ
	if (mustHandle >= 5) return "B"; // 必須対応が多い → 要対応・強調
	return "A"; // 必須対応 1-4件 → 通常のお願い
}

// 全パターン共通のクロージング文 (1文・改行なし)
const CLOSING_TEXT = [
	"",
	"ステータスの整理は経営判断(入園率の見える化・採用計画)にも直結する大切な情報になりますので、ご協力よろしくお願いいたします。",
	"",
	"--",
	"SOUキッズケア 本社事務局",
	"(自動配信メールです)",
];

function buildSubjectBody(row, pattern, directorName, month, sheetUrl) {
	const headerLine = row.nursery; // 宛名: 園名のみ
	const sheetLine = sheetUrl
		? [`${row.nursery}のシート: ${sheetUrl}`, ""]
		: [];

	const mustHandle = row.unanswered + row.inProgress;

	// 未対応・対応中の案件を実態に合わせて更新する際の選択肢 (共通)
	const statusChoices = [
		"(保護者様への確認は不要です。園長様の認識ベースでの更新で構いません)",
		"",
		"  更新先: [入園] / [辞退] / [連絡つかない] / [諸事情により受入不可]",
		"        [保護者様検討中] / [待ちリスト登録済み] / [ご案内済]",
	];
	// ご案内済の扱い (共通・優先度低)
	const guidedNote = [
		"▼ 「ご案内済」について",
		"「ご案内済」の案件は、状況に変化があった場合のみステータス変更をお願いします。",
		"(変化がなければ、そのままで構いません)",
	];

	if (pattern === "C") {
		return {
			subject: `【SOUキッズケア】${month}月 ステータスは良好です(${row.nursery})`,
			text: [
				headerLine,
				"",
				"いつもありがとうございます。",
				`${month}月時点で、対応が必要な「未対応」「対応中」の案件はございません。`,
				"",
				`▼ ${row.nursery} 現在の状況`,
				"・未対応: 0件",
				"・対応中: 0件",
				"",
				"日々の丁寧なステータス更新、ありがとうございます。",
				...guidedNote,
				"",
				...sheetLine,
				...CLOSING_TEXT,
			].join("\n"),
		};
	}
	if (pattern === "B") {
		return {
			subject: `【SOUキッズケア】${month}月 ステータス更新のお願い(${row.nursery}・要対応)`,
			text: [
				headerLine,
				"",
				"いつも保護者様対応をありがとうございます。",
				`${month}月の問い合わせステータスについてご相談です。`,
				"",
				`▼ ${row.nursery} 必須対応(優先的にステータス更新をお願いします)`,
				`・未対応: ${row.unanswered}件`,
				`・対応中: ${row.inProgress}件`,
				"",
				`「未対応」「対応中」の案件が合計${mustHandle}件あります。`,
				"現在の状況に合わせて、優先的にステータス更新をお願いいたします。",
				...statusChoices,
				"",
				...guidedNote,
				"",
				...sheetLine,
				...CLOSING_TEXT,
			].join("\n"),
		};
	}
	// パターンA(通常・必須対応 1-4件)
	return {
		subject: `【SOUキッズケア】${month}月 ステータス更新のお願い(${row.nursery})`,
		text: [
			headerLine,
			"",
			"いつも保護者様対応とご入園後のサポート、ありがとうございます。",
			`${month}月の問い合わせステータスについてご連絡です。`,
			"",
			`▼ ${row.nursery} 必須対応(ステータス更新をお願いします)`,
			`・未対応: ${row.unanswered}件`,
			`・対応中: ${row.inProgress}件`,
			"",
			"上記の「未対応」「対応中」の案件について、現在の状況に合わせて更新をお願いいたします。",
			...statusChoices,
			"",
			...guidedNote,
			"",
			...sheetLine,
			...CLOSING_TEXT,
		].join("\n"),
	};
}

// HTML版テンプレート (見栄え改善・テキスト版とセットで送信)
function buildHtml(row, pattern, month, sheetUrl) {
	const sheetButton = sheetUrl
		? `<p style="margin:20px 0;text-align:center;">
				<a href="${esc(sheetUrl)}" style="display:inline-block;background:#0078ab;color:#fff;padding:12px 24px;text-decoration:none;font-weight:600;">${esc(row.nursery)}のシートを開く</a>
			</p>`
		: "";

	const closing = `
		<div style="background:#f8f9fa;padding:16px;margin-top:24px;border-left:4px solid #008cc9;">
			<p style="margin:0;font-size:14px;color:#444;line-height:1.7;">
				ステータスの整理は経営判断(入園率の見える化・採用計画)にも直結する大切な情報になりますので、ご協力よろしくお願いいたします。
			</p>
		</div>
		<div style="margin-top:24px;padding-top:16px;border-top:1px solid #ddd;font-size:12px;color:#888;text-align:center;">
			SOUキッズケア 本社事務局<br>
			(自動配信メールです)
		</div>`;

	const mustHandle = row.unanswered + row.inProgress;

	// 必須対応(未対応・対応中)を主眼にした数値表 (A/B共通)
	const mustHandleTable = (accent) => `
		<table style="width:100%;border-collapse:collapse;margin:12px 0;">
			<tr><td style="padding:8px;background:#fef3e7;border:1px solid #e0d4c0;width:60%;">未対応</td><td style="padding:8px;border:1px solid #e0d4c0;text-align:right;font-weight:700;color:${accent};">${row.unanswered}件</td></tr>
			<tr><td style="padding:8px;background:#fef3e7;border:1px solid #e0d4c0;">対応中</td><td style="padding:8px;border:1px solid #e0d4c0;text-align:right;font-weight:700;color:${accent};">${row.inProgress}件</td></tr>
		</table>`;
	const tableA = mustHandleTable("#d97706");
	const tableB = mustHandleTable("#dc2626");
	const tableC = `
		<table style="width:100%;border-collapse:collapse;margin:12px 0;">
			<tr><td style="padding:8px;background:#fef3e7;border:1px solid #e0d4c0;width:60%;">未対応</td><td style="padding:8px;border:1px solid #e0d4c0;text-align:right;font-weight:700;color:#059669;">0件</td></tr>
			<tr><td style="padding:8px;background:#fef3e7;border:1px solid #e0d4c0;">対応中</td><td style="padding:8px;border:1px solid #e0d4c0;text-align:right;font-weight:700;color:#059669;">0件</td></tr>
		</table>`;
	// ご案内済の扱い (共通・優先度低の注記ボックス)
	const guidedNoteHtml = `
		<div style="background:#f8f9fa;padding:12px 16px;margin:16px 0;border-left:3px solid #bbb;">
			<p style="margin:0;font-size:13px;color:#666;line-height:1.7;">
				<strong>「ご案内済」について</strong><br>
				「ご案内済」の案件は、状況に変化があった場合のみステータス変更をお願いします。(変化がなければそのままで構いません)
			</p>
		</div>`;
	// 更新先ステータスの選択肢 (A/B共通)
	const statusChoicesHtml = `
		<p style="font-size:13px;color:#666;margin-bottom:4px;">(保護者様への確認は不要です。園長様の認識ベースでの更新で構いません)</p>
		<p style="font-size:14px;color:#444;">更新先: ［入園］／［辞退］／［連絡つかない］／［諸事情により受入不可］<br>　　　　［保護者様検討中］／［待ちリスト登録済み］／［ご案内済］</p>`;

	const baseWrap = (innerHtml) => `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Hiragino Kaku Gothic ProN','Meiryo',sans-serif;color:#333;line-height:1.7;">
	<div style="max-width:600px;margin:0 auto;background:#fff;padding:30px;">
		<div style="border-bottom:3px solid #008cc9;padding-bottom:12px;margin-bottom:20px;">
			<div style="font-size:13px;color:#008cc9;font-weight:600;">SOUキッズケア 月次ご連絡</div>
			<div style="font-size:20px;font-weight:700;color:#222;margin-top:4px;">${esc(row.nursery)}</div>
		</div>
		${innerHtml}
		${closing}
	</div>
</body></html>`;

	if (pattern === "C") {
		return baseWrap(`
			<p style="font-size:15px;">いつもありがとうございます。<br>${month}月時点で、対応が必要な「未対応」「対応中」の案件はございません。</p>
			<h3 style="font-size:15px;color:#059669;border-left:4px solid #059669;padding-left:10px;margin-top:24px;">現在の状況</h3>
			${tableC}
			<p>日々の丁寧なステータス更新、ありがとうございます。</p>
			${guidedNoteHtml}
			${sheetButton}
		`);
	}
	if (pattern === "B") {
		return baseWrap(`
			<p style="font-size:15px;">いつも保護者様対応をありがとうございます。<br>${month}月の問い合わせステータスについてご相談です。</p>
			<h3 style="font-size:15px;color:#dc2626;border-left:4px solid #dc2626;padding-left:10px;margin-top:24px;">必須対応(優先的にステータス更新をお願いします)</h3>
			${tableB}
			<p style="font-size:14px;">「未対応」「対応中」の案件が合計<strong style="color:#dc2626;">${mustHandle}件</strong>あります。優先的にステータス更新をお願いいたします。</p>
			${statusChoicesHtml}
			${guidedNoteHtml}
			${sheetButton}
		`);
	}
	return baseWrap(`
		<p style="font-size:15px;">いつも保護者様対応とご入園後のサポート、ありがとうございます。<br>${month}月の問い合わせステータスについてご連絡です。</p>
		<h3 style="font-size:15px;color:#d97706;border-left:4px solid #d97706;padding-left:10px;margin-top:24px;">必須対応(ステータス更新をお願いします)</h3>
		${tableA}
		<p style="font-size:14px;">上記の「未対応」「対応中」の案件について、ステータス更新をお願いいたします。</p>
		${statusChoicesHtml}
		${guidedNoteHtml}
		${sheetButton}
	`);
}

function parseConfig(masterRows) {
	const config = { sendEnabled: false };
	for (const row of masterRows.slice(0, 5)) {
		if (!row[0]) continue;
		const label = row[0];
		if (label.includes("共通本社CC")) config.commonCc = (row[1] ?? "").trim();
		else if (label.includes("浅野BCC")) config.asanoBcc = (row[1] ?? "").trim();
		if (row[4]) {
			const label2 = row[4];
			if (label2.includes("送信元")) config.fromAddress = (row[5] ?? "").trim();
			else if (label2.includes("送信実施フラグ"))
				config.sendEnabled = (row[5] ?? "").trim().toUpperCase() === "TRUE";
		}
	}
	return config;
}

function parseNurseries(masterRows) {
	const list = [];
	for (let i = 5; i < masterRows.length; i++) {
		const r = masterRows[i];
		if (!r || !r[0]) continue;
		const [name, brand, director, email, individualCc, cityCode, notifyOn, patternForced] =
			[r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]];
		if ((notifyOn ?? "").trim().toUpperCase() !== "TRUE") continue;
		if (!email || !email.trim()) continue;
		list.push({
			name: name.trim(),
			brand: (brand ?? "").trim(),
			director: (director ?? "").trim(),
			email: email.trim(),
			individualCc: (individualCc ?? "").trim(),
			cityCode: (cityCode ?? "").trim(),
			patternForced: (patternForced ?? "").trim().toUpperCase(),
		});
	}
	return list;
}

function parseInquiries(rows) {
	if (rows.length === 0) return [];
	const header = rows[0];
	const idx = (name) => header.findIndex((h) => h?.trim() === name);
	const iDate = idx("post_date");
	const iStatus = idx("ステータス");
	const iSheet = idx("シート名");
	const iNursery = idx("nursery");
	const inquiries = [];
	for (let i = 1; i < rows.length; i++) {
		const r = rows[i];
		const sheet = (r[iSheet] ?? "").trim();
		const status = (r[iStatus] ?? "").trim();
		if (sheet === "その他" || status === "その他(営業等)") continue;
		inquiries.push({
			postDate: r[iDate] ?? "",
			status,
			sheetName: sheet,
			nursery: r[iNursery] ?? "",
		});
	}
	return inquiries;
}

async function main() {
	if (!SHEET_ID_INQUIRIES) throw new Error("GOOGLE_SHEET_ID 未設定");

	// 営業日判定 (GitHub Actions schedule経由かつ FORCE_RUN=false の場合のみ判定)
	// workflow_dispatch (手動実行) / TEST_MODE / PREVIEW_MD / FORCE_RUN=true はスキップ
	const eventName = process.env.GITHUB_EVENT_NAME;
	const isSchedule = eventName === "schedule";
	const now = new Date();
	const bizDayNumber = getBusinessDayNumberJST(now);
	if (isSchedule && !FORCE_RUN && !TEST_MODE && !PREVIEW_MD) {
		if (bizDayNumber === null) {
			console.log("本日は営業日ではないためスキップ (土日または元旦)");
			return;
		}
		const targetBrands = Object.entries(BRAND_TO_BUSINESS_DAY)
			.filter(([, day]) => day === bizDayNumber)
			.map(([brand]) => brand);
		if (targetBrands.length === 0) {
			console.log(
				`本日は第${bizDayNumber}営業日: 配信対象ブランドなしのためスキップ`,
			);
			return;
		}
		console.log(
			`本日は第${bizDayNumber}営業日: 配信対象ブランド = ${targetBrands.join(", ")}`,
		);
	}

	const auth = authClient();
	await auth.authorize();

	console.log("Fetching 園マスタ_通知...");
	const masterRows = await getSheetValues(auth, SHEET_ID_NOTIFY, "園マスタ_通知!A1:J100");
	const config = parseConfig(masterRows);
	let nurseries = parseNurseries(masterRows);
	console.log(`  active nurseries: ${nurseries.length}`);
	console.log(`  send enabled: ${config.sendEnabled}`);
	console.log(`  from: ${config.fromAddress || "(未設定)"}`);

	// 営業日ブランドフィルタ (schedule経由のみ)
	// workflow_dispatch / TEST_MODE / PREVIEW_MD / FORCE_RUN=true は全ブランド対象
	if (isSchedule && !FORCE_RUN && !TEST_MODE && !PREVIEW_MD && bizDayNumber !== null) {
		const before = nurseries.length;
		nurseries = nurseries.filter((n) => {
			const day = BRAND_TO_BUSINESS_DAY[n.brand] ?? DEFAULT_BUSINESS_DAY;
			return day === bizDayNumber;
		});
		console.log(
			`  第${bizDayNumber}営業日フィルタ: ${before} → ${nurseries.length}件`,
		);
	}

	// BRAND_FILTER (部分一致): 例 BRAND_FILTER="POP" でわくわく保育園のみ
	if (BRAND_FILTER) {
		const before = nurseries.length;
		nurseries = nurseries.filter((n) => n.brand.includes(BRAND_FILTER));
		console.log(
			`  BRAND_FILTER="${BRAND_FILTER}": ${before} → ${nurseries.length}件`,
		);
	}

	console.log("Fetching worksheet map (各園シートURL用)...");
	const worksheetMap = await getWorksheetMap(auth, SHEET_ID_NOTIFY);
	console.log(`  worksheets: ${Object.keys(worksheetMap).length}`);

	if (!config.sendEnabled && !TEST_MODE && !PREVIEW_MD) {
		console.log("送信実施フラグがFALSEのため終了 (TEST_MODE=true で強制実行可)");
		return;
	}
	if (!PREVIEW_MD && (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD)) {
		throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASSWORD 未設定");
	}

	console.log("Fetching 全データ...");
	const inqRows = await getSheetValues(auth, SHEET_ID_INQUIRIES, "全データ!A1:AK10000");
	const inquiries = parseInquiries(inqRows);
	console.log(`  inquiries: ${inquiries.length}`);

	const fy = getCurrentFY(now);
	const fyStart = new Date(fy, 3, 1);
	const fyEnd = new Date(fy + 1, 2, 31, 23, 59, 59);
	const month = now.getMonth() + 1;
	const stats = computeNurseryStats(inquiries, fyStart, fyEnd);
	const statsByName = new Map(stats.map((s) => [s.nursery, s]));

	let transporter = null;
	if (!PREVIEW_MD) {
		transporter = nodemailer.createTransport({
			host: SMTP_HOST,
			port: SMTP_PORT,
			secure: SMTP_SECURE, // true=465 SSL / false=587 STARTTLS
			auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
		});

		// 接続検証 (失敗時の早期エラー)
		try {
			await transporter.verify();
			console.log(
				`SMTP verify OK: ${SMTP_HOST}:${SMTP_PORT} secure=${SMTP_SECURE}`,
			);
		} catch (e) {
			console.error(`SMTP verify FAILED: ${e?.message ?? e}`);
			throw e;
		}
	}

	// 全園のパターン判定 + 統計を先に揃える
	const taskList = nurseries.map((n) => {
		const row = statsByName.get(n.name) ?? {
			nursery: n.name,
			total: 0,
			decided: 0,
			pending: 0,
			guided: 0,
			unanswered: 0,
			enrolled: 0,
			guidedStall90: 0,
		};
		const pattern = n.patternForced || determinePattern(row);
		return { n, row, pattern };
	});

	// FY問い合わせ0件園はスキップ (棚卸し不要のため通知しない)
	const zeroInquiryTasks = taskList.filter((t) => t.row.total === 0);
	const activeTaskList = taskList.filter((t) => t.row.total > 0);
	if (zeroInquiryTasks.length > 0) {
		console.log(
			`  FY問い合わせ0件でスキップ: ${zeroInquiryTasks.length}園 (${zeroInquiryTasks.map((t) => t.n.name).join(", ")})`,
		);
	}

	// SAMPLE_MODE: 各パターン(A/B/C)から最初の1園ずつ
	let targets = activeTaskList;
	if (SAMPLE_MODE) {
		const seen = new Set();
		const picked = [];
		for (const t of activeTaskList) {
			if (!seen.has(t.pattern)) {
				seen.add(t.pattern);
				picked.push(t);
				if (seen.size === 3) break;
			}
		}
		targets = picked;
		console.log(
			`SAMPLE_MODE: ${picked.length}件抽出 (${picked.map((t) => `${t.pattern}=${t.n.name}`).join(", ")})`,
		);
	}

	const results = [];
	const previewItems = [];
	for (const { n, row, pattern } of targets) {
		const sheetUrl = nurseryUrl(n.name, worksheetMap, SHEET_ID_NOTIFY);
		const { subject, text } = buildSubjectBody(row, pattern, n.director, month, sheetUrl);
		const html = buildHtml(row, pattern, month, sheetUrl);
		const to = TEST_MODE ? TEST_RECIPIENT : n.email;
		const cc = TEST_MODE
			? ""
			: [config.commonCc, n.individualCc].filter(Boolean).join(",");
		const bcc = TEST_MODE ? "" : (config.asanoBcc ?? "");

		const timestamp = new Date()
			.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", hour12: false })
			.replace(/\//g, "-");

		console.log(
			`  ${n.name} [${pattern}] → to:${to} cc:${cc} bcc:${bcc} (pending:${row.pending}/guided:${row.guided}/stall90:${row.guidedStall90})`,
		);

		let status = "成功";
		if (PREVIEW_MD) {
			status = "PREVIEW_MD";
			previewItems.push({ n, row, pattern, subject, body: text, to, cc, bcc });
		} else if (DRY_RUN) {
			status = "DRY_RUN";
		} else {
			try {
				await transporter.sendMail({
					from: `"${FROM_NAME}" <${FROM_ADDRESS}>`,
					sender: FROM_ADDRESS,
					to,
					cc: cc || undefined,
					bcc: bcc || undefined,
					subject,
					text,
					html,
					envelope: {
						from: FROM_ADDRESS,
						to: [to, cc, bcc].filter(Boolean).join(","),
					},
				});
			} catch (e) {
				status = `失敗: ${e?.message ?? String(e)}`;
				console.error(
					`  ${n.name} ERROR: code=${e?.code} response=${e?.response} message=${e?.message}`,
				);
			}
		}

		results.push([
			timestamp,
			n.name,
			n.brand,
			pattern,
			to,
			cc,
			bcc,
			row.unanswered,
			row.guided,
			row.enrolled,
			subject,
			status,
		]);

		// SMTP レート対策 (PREVIEW_MD時は不要)
		if (!PREVIEW_MD) {
			await new Promise((r) => setTimeout(r, 1000));
		}
	}

	if (PREVIEW_MD) {
		const today = new Date()
			.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
		const outPath = path.resolve(
			__dirname,
			`../../../reports/email-preview-${today}.md`,
		);
		const counts = { A: 0, B: 0, C: 0 };
		for (const it of previewItems) counts[it.pattern]++;
		const lines = [];
		lines.push(`# 園リマインドメール プレビュー (${today})`);
		lines.push("");
		lines.push(`**対象月**: ${month}月`);
		lines.push(`**集計対象**: FY${fy}`);
		lines.push(
			`**対象園数**: ${previewItems.length}件 (A通常=${counts.A} / B要対応=${counts.B} / C良好園=${counts.C})`,
		);
		lines.push(`**共通CC**: ${config.commonCc || "(未設定)"}`);
		lines.push(`**BCC**: ${config.asanoBcc || "(未設定)"}`);
		lines.push(`**送信元(予定)**: ${config.fromAddress || "(未設定)"}`);
		lines.push("");
		lines.push("## パターン判定基準");
		lines.push("- **C(良好園)**: 決着率 ≥ 50%");
		lines.push(
			"- **B(要対応)**: 未決着 > 10件 または 91日超のご案内済滞留 ≥ 5件",
		);
		lines.push("- **A(通常)**: 上記以外");
		lines.push("");
		lines.push("---");
		lines.push("");
		// 目次
		lines.push("## 目次");
		previewItems.forEach((it, i) => {
			const slug = `${i + 1}-${it.pattern}-${it.n.name}`;
			lines.push(`- [${i + 1}. [${it.pattern}] ${it.n.name}](#${slug})`);
		});
		lines.push("");
		lines.push("---");
		lines.push("");
		previewItems.forEach((it, i) => {
			const slug = `${i + 1}-${it.pattern}-${it.n.name}`;
			lines.push(`<a id="${slug}"></a>`);
			lines.push(`## ${i + 1}. [${it.pattern}] ${it.n.name}`);
			lines.push("");
			lines.push("| 項目 | 値 |");
			lines.push("|---|---|");
			lines.push(`| ブランド | ${it.n.brand} |`);
			lines.push(`| 園長 | ${it.n.director || "(未登録)"} |`);
			lines.push(`| To | ${it.to} |`);
			lines.push(`| CC | ${it.cc || "(なし)"} |`);
			lines.push(`| BCC | ${it.bcc || "(なし)"} |`);
			lines.push(`| 総数 | ${it.row.total} |`);
			lines.push(`| 決着 | ${it.row.decided} |`);
			lines.push(`| 未決着 | ${it.row.pending} (うちご案内済${it.row.guided}) |`);
			lines.push(`| 91日超滞留 | ${it.row.guidedStall90} |`);
			lines.push(`| 未対応 | ${it.row.unanswered} |`);
			lines.push(`| 入園 | ${it.row.enrolled} |`);
			lines.push("");
			lines.push(`**件名**: ${it.subject}`);
			lines.push("");
			lines.push("**本文**:");
			lines.push("");
			lines.push("```");
			lines.push(it.body);
			lines.push("```");
			lines.push("");
			lines.push("---");
			lines.push("");
		});
		fs.mkdirSync(path.dirname(outPath), { recursive: true });
		fs.writeFileSync(outPath, lines.join("\n"), "utf-8");
		console.log(`\nPREVIEW_MD: ${outPath} に書き出しました`);
		console.log(`  対象園: ${previewItems.length}件 (A=${counts.A} B=${counts.B} C=${counts.C})`);
		return;
	}

	console.log("Writing 通知ログ...");
	for (const row of results) {
		await appendSheetRow(auth, SHEET_ID_NOTIFY, "通知ログ!A1:L1", row);
	}

	console.log(`Done. ${results.length} 件処理完了 (DRY_RUN=${DRY_RUN}, TEST_MODE=${TEST_MODE})`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
