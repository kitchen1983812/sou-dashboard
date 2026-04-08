import { google } from "googleapis";

let authClient: InstanceType<typeof google.auth.JWT> | null = null;

function getAuth() {
  if (authClient) return authClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY must be set."
    );
  }

  const key = privateKey.replace(/\\n/g, "\n");

  authClient = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return authClient;
}

/**
 * 指定シートの全行を取得する
 * @param sheetName シートタブ名（例："全データ"）
 * @param spreadsheetIdOverride 別のスプレッドシートIDを指定（省略時はGOOGLE_SHEET_ID）
 * @returns ヘッダー行を含む2次元配列
 */
export async function getSheetData(
  sheetName: string,
  spreadsheetIdOverride?: string
): Promise<string[][]> {
  const spreadsheetId = spreadsheetIdOverride || process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID is not set.");
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  });

  return (res.data.values || []) as string[][];
}

/**
 * 指定シートに行を上書き書き込みする（既存データをクリアして全行置換）
 */
export async function writeSheetData(
  sheetName: string,
  values: string[][],
  spreadsheetIdOverride?: string,
): Promise<void> {
  const spreadsheetId = spreadsheetIdOverride || process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEET_ID is not set.");

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // シートが存在しない場合は作成
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some(
    (s) => s.properties?.title === sheetName,
  );
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  }

  // 既存データをクリアして書き込み
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: sheetName });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });
}
