export const dynamic = "force-dynamic";

import { getSheetData } from "@/lib/googleSheets";
import { transformInquiries } from "@/lib/transform";
import {
  transformAdKeywordData,
  transformAdSearchQueryData,
} from "@/lib/transformAds";
import {
  transformApplicants,
  transformRecruitCosts,
} from "@/lib/transformRecruit";
import { parseDate, getFiscalYear } from "@/lib/dashboardUtils";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const adsSheetId = process.env.GOOGLE_SHEET_ID_ADS;
  const recruitSheetId = process.env.GOOGLE_SHEET_ID_RECRUIT;

  // メインシート、FY22シート、Google広告シート×2、採用シート×2を並列取得
  const [rawMain, rawFY22, rawAdKeywords, rawAdSearchQueries, rawApplicants, rawRecruitCosts] =
    await Promise.all([
      getSheetData("全データ"),
      process.env.GOOGLE_SHEET_ID_FY22
        ? getSheetData("全データ", process.env.GOOGLE_SHEET_ID_FY22)
        : Promise.resolve([] as string[][]),
      adsSheetId
        ? getSheetData("【SOU】Google広告パフォーマンス", adsSheetId)
        : Promise.resolve([] as string[][]),
      adsSheetId
        ? getSheetData("検索語句", adsSheetId)
        : Promise.resolve([] as string[][]),
      recruitSheetId
        ? getSheetData("応募者（統合）", recruitSheetId)
        : Promise.resolve([] as string[][]),
      recruitSheetId
        ? getSheetData("採用費（統合）", recruitSheetId)
        : Promise.resolve([] as string[][]),
    ]);

  const mainInquiries = transformInquiries(rawMain);
  const fy22Inquiries = transformInquiries(rawFY22);

  // FY22以前の企業未設定データはアルコバレーノとして扱う
  const inquiries = [...mainInquiries, ...fy22Inquiries].map((inq) => {
    if (!inq.company) {
      const d = parseDate(inq.postDate);
      if (d && getFiscalYear(d) <= 2022) {
        return { ...inq, company: "アルコバレーノ" };
      }
    }
    return inq;
  });

  const adKeywords = transformAdKeywordData(rawAdKeywords);
  const adSearchQueries = transformAdSearchQueryData(rawAdSearchQueries);
  const applicants = transformApplicants(rawApplicants);
  const recruitCosts = transformRecruitCosts(rawRecruitCosts);

  return (
    <DashboardClient
      inquiries={inquiries}
      adKeywords={adKeywords}
      adSearchQueries={adSearchQueries}
      applicants={applicants}
      recruitCosts={recruitCosts}
    />
  );
}
