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

import { google } from "googleapis";
import nodemailer from "nodemailer";

const SHEET_ID_INQUIRIES = process.env.GOOGLE_SHEET_ID;
const SHEET_ID_NOTIFY = process.env.NOTIFY_SHEET_ID || "1JcmgUo0kGim_5ojtE8C3Mhn8IXL4Dmh7LMuLFJi5ygc";
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? "587", 10);
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const FROM_NAME = process.env.FROM_NAME ?? "SOUキッズケア本社事務局";
const TEST_MODE = process.env.TEST_MODE === "true";
const TEST_RECIPIENT = process.env.TEST_RECIPIENT;
const DRY_RUN = process.env.DRY_RUN === "true";

const DASHBOARD_URL = "https://sou-dashboard.vercel.app/dashboard";
const ARRANGEMENT_SHEET_URL =
	"https://docs.google.com/spreadsheets/d/1JZBJuvlzKL0iujUcz-dtJMcJmjB47jjXyR_kiXvFH1A/edit";

const DECIDED_STATUSES = new Set([
	"入園",
	"辞退",
	"連絡つかない",
	"諸事情により受入不可",
	"重複",
]);
const STATUS_GUIDED = "ご案内済";
const STATUS_UNANSWERED = "未対応";
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
		if (s === STATUS_ENROLLED) row.enrolled++;
	}
	return Array.from(map.values());
}

function determinePattern(row) {
	const decidedRate = row.total > 0 ? (row.decided / row.total) * 100 : 0;
	if (decidedRate >= 50) return "C";
	if (row.pending > 10 || row.guidedStall90 >= 5) return "B";
	return "A";
}

function buildSubjectBody(row, pattern, directorName, month) {
	const directorPrefix = directorName ? `${directorName} 様` : "園長 様";
	if (pattern === "C") {
		return {
			subject: `【SOUキッズケア】${month}月 ステータス整理ご協力への御礼(${row.nursery})`,
			body: [
				directorPrefix,
				"",
				"いつもありがとうございます。",
				`${month}月のステータス整理状況のご報告と、ご相談がございます。`,
				"",
				`▼ ${row.nursery} 現在の状況`,
				`・総問い合わせ件数: ${row.total}件`,
				`・決着率: ${row.total > 0 ? ((row.decided / row.total) * 100).toFixed(1) : 0}%`,
				"・ご案内済の長期滞留: ほとんどありません",
				"",
				"▼ 御礼",
				"日々のステータス更新を丁寧に実施いただき、ありがとうございます。",
				`${row.nursery}の運用は、SOUキッズケア全体の中でもベンチマーク的な水準です。`,
				"",
				"▼ ご相談",
				"他園でステータス更新がうまく進んでいないケースがあり、",
				`${row.nursery}の運用フローを参考にさせていただきたく、20分ほどお時間を頂戴できないでしょうか。`,
				"",
				"オンラインまたは電話で構いません。ご都合のよい日時を本社事務局までお知らせください。",
				"",
				`ダッシュボード: ${DASHBOARD_URL}`,
				"",
				"--",
				"SOUキッズケア 本社事務局",
				"(自動配信メールです)",
			].join("\n"),
		};
	}
	if (pattern === "B") {
		return {
			subject: `【SOUキッズケア】${month}月 ステータス棚卸しのお願い(${row.nursery}・要対応)`,
			body: [
				directorPrefix,
				"",
				"いつも保護者様対応をありがとうございます。",
				`${month}月のステータス棚卸しに関して、ご相談がございます。`,
				"",
				`▼ ${row.nursery} 現在の状況`,
				`・未決着件数: ${row.pending}件(うち、ご案内済 ${row.guided}件)`,
				`・91日超 ご案内済滞留: ${row.guidedStall90}件`,
				`・未対応: ${row.unanswered}件`,
				`・FY入園実績: ${row.enrolled}件`,
				"",
				"▼ ご依頼内容",
				"ご案内済のまま長期間が経過している案件が一定数あり、",
				"実際にはご入園・ご辞退で既に決着しているケースも含まれている可能性があります。",
				"",
				"以下のいずれかに該当する案件があれば、最終ステータスへの更新をお願いいたします。",
				"(保護者様への確認は不要です。園長様の認識ベースでの更新で構いません)",
				"",
				"  ・既に入園された方",
				"  ・他園に決まった/辞退された方",
				"  ・一定期間連絡がつかない方",
				"  ・受入要件と合致しなかった方",
				"",
				"▼ 集中棚卸し時間のご提案",
				"通常作業に上乗せの依頼となるため、",
				`${month}月中に60分ほどお時間をいただければ十分かと思います。`,
				"",
				"▼ 本社サポート",
				"ご不明点・ご相談は本社事務局まで。",
				"リストの一括確認方法のご案内も可能です。",
				"",
				`ダッシュボード: ${DASHBOARD_URL}`,
				`配置表: ${ARRANGEMENT_SHEET_URL}`,
				"",
				"--",
				"SOUキッズケア 本社事務局",
				"(自動配信メールです)",
			].join("\n"),
		};
	}
	return {
		subject: `【SOUキッズケア】${month}月 ステータス棚卸しのお願い(${row.nursery})`,
		body: [
			directorPrefix,
			"",
			"いつも保護者様対応とご入園後のサポート、ありがとうございます。",
			`${month}月の問い合わせステータス棚卸しのご案内です。`,
			"",
			`▼ ${row.nursery} 現在の状況`,
			`・総問い合わせ件数: ${row.total}件`,
			`・決着済み: ${row.decided}件`,
			`・未決着(ご案内済 含む): ${row.pending}件`,
			`・うち、ご案内済: ${row.guided}件`,
			"",
			"▼ ご依頼内容",
			"「ご案内済」のままになっている方について、以下のいずれかへ更新をお願いします。",
			"保育園としての対応自体は完了されていることが多いですが、",
			"シート上のステータスのみが古くなっているケースがあります。",
			"",
			"  [入園]      … 既にご入園された方",
			"  [辞退]      … ご家庭側で辞退の意思表明があった方",
			"  [連絡つかない] … 一定期間以上、保護者様と連絡が取れていない方",
			"  [諸事情により受入不可] … 受け入れ要件と合致しなかった方",
			"  [保護者様検討中] … 検討中の連絡が直近で取れている方",
			"  [待ちリスト登録済み] … 空き待ちで継続フォロー中の方",
			"",
			"▼ 作業の目安",
			"30分程度を目安にご対応いただけますと幸いです。",
			"ご不明点があれば本社事務局までお気軽にご相談ください。",
			"",
			`ダッシュボード: ${DASHBOARD_URL}`,
			`配置表: ${ARRANGEMENT_SHEET_URL}`,
			"",
			"ステータスの整理は経営判断(入園率の見える化・採用計画)にも直結する大切な情報になります。",
			"ご協力よろしくお願いいたします。",
			"",
			"--",
			"SOUキッズケア 本社事務局",
			"(自動配信メールです)",
		].join("\n"),
	};
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

	const auth = authClient();
	await auth.authorize();

	console.log("Fetching 園マスタ_通知...");
	const masterRows = await getSheetValues(auth, SHEET_ID_NOTIFY, "園マスタ_通知!A1:J100");
	const config = parseConfig(masterRows);
	const nurseries = parseNurseries(masterRows);
	console.log(`  active nurseries: ${nurseries.length}`);
	console.log(`  send enabled: ${config.sendEnabled}`);
	console.log(`  from: ${config.fromAddress || "(未設定)"}`);

	if (!config.sendEnabled && !TEST_MODE) {
		console.log("送信実施フラグがFALSEのため終了 (TEST_MODE=true で強制実行可)");
		return;
	}
	if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
		throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASSWORD 未設定");
	}

	console.log("Fetching 全データ...");
	const inqRows = await getSheetValues(auth, SHEET_ID_INQUIRIES, "全データ!A1:AK10000");
	const inquiries = parseInquiries(inqRows);
	console.log(`  inquiries: ${inquiries.length}`);

	const now = new Date();
	const fy = getCurrentFY(now);
	const fyStart = new Date(fy, 3, 1);
	const fyEnd = new Date(fy + 1, 2, 31, 23, 59, 59);
	const month = now.getMonth() + 1;
	const stats = computeNurseryStats(inquiries, fyStart, fyEnd);
	const statsByName = new Map(stats.map((s) => [s.nursery, s]));

	const transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: SMTP_PORT,
		secure: SMTP_SECURE, // true=465 SSL / false=587 STARTTLS
		auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
	});

	const results = [];
	for (const n of nurseries) {
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
		const { subject, body } = buildSubjectBody(row, pattern, n.director, month);
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
		if (DRY_RUN) {
			status = "DRY_RUN";
		} else {
			try {
				await transporter.sendMail({
					from: `"${FROM_NAME}" <${SMTP_USER}>`,
					to,
					cc: cc || undefined,
					bcc: bcc || undefined,
					subject,
					text: body,
				});
			} catch (e) {
				status = `失敗: ${e?.message ?? String(e)}`;
				console.error(`  ${n.name} ERROR: ${e?.message ?? e}`);
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

		// Gmail SMTP レート対策
		await new Promise((r) => setTimeout(r, 1000));
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
