// /pages/api/ziwei-core.js
// v1.59 — 紫微核心演算（命宮、身宮、五行局、命主、身主、命宮主星）
// ------------------------------------------------------------

// 12地支順序
const BRANCH = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const HOUR_INDEX = { 子:0, 丑:1, 寅:2, 卯:3, 辰:4, 巳:5, 午:6, 未:7, 申:8, 酉:9, 戌:10, 亥:11 };

// ------------------------------------------------------------
// ✳️ 年干 → 五行與陰陽
const STEMS = [
  { stem: "甲", element: "木", yinYang: "陽" },
  { stem: "乙", element: "木", yinYang: "陰" },
  { stem: "丙", element: "火", yinYang: "陽" },
  { stem: "丁", element: "火", yinYang: "陰" },
  { stem: "戊", element: "土", yinYang: "陽" },
  { stem: "己", element: "土", yinYang: "陰" },
  { stem: "庚", element: "金", yinYang: "陽" },
  { stem: "辛", element: "金", yinYang: "陰" },
  { stem: "壬", element: "水", yinYang: "陽" },
  { stem: "癸", element: "水", yinYang: "陰" },
];

// ✳️ 五行局（由 年干 五行決定，陰陽反向）
const ELEMENT_TO_BUREAU = {
  "木陽": "水二局", "木陰": "水二局",
  "火陽": "火六局", "火陰": "火六局",
  "土陽": "土五局", "土陰": "土五局",
  "金陽": "金四局", "金陰": "金四局",
  "水陽": "木三局", "水陰": "木三局",
};

// ✳️ 命主 / 身主（依五行局）
const LORDS = {
  "水二局": { ming: "太陽", shen: "天機" },
  "木三局": { ming: "武曲", shen: "天機" },
  "金四局": { ming: "巨門", shen: "天府" },
  "土五局": { ming: "廉貞", shen: "天相" },
  "火六局": { ming: "武曲", shen: "天梁" }
};

// ✳️ 命宮主星（固定表）
const MING_STARS = {
  "子":["紫微","破軍"], "丑":["武曲","七殺"], "寅":["太陽"], "卯":["太陰"],
  "辰":["廉貞","貪狼"], "巳":["武曲","七殺"], "午":["紫微","破軍"], "未":["天同","天梁"],
  "申":["太陽"], "酉":["太陰"], "戌":["廉貞","貪狼"], "亥":["天府"]
};

// ✳️ 命宮矩陣（12月 × 12時）
const MING_MATRIX = [
  [], // dummy
  ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"],  // 正月
  ["丑","寅","卯","辰","巳","午","未","申","酉","戌","亥","子"],  // 二月
  ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"],  // 三月
  ["亥","子","丑","寅","卯","辰","巳","午","未","申","酉","戌"],  // 四月
  ["戌","亥","子","丑","寅","卯","辰","巳","午","未","申","酉"],  // 五月
  ["酉","戌","亥","子","丑","寅","卯","辰","巳","午","未","申"],  // 六月
  ["申","酉","戌","亥","子","丑","寅","卯","辰","巳","午","未"],  // 七月
  ["未","申","酉","戌","亥","子","丑","寅","卯","辰","巳","午"],  // 八月
  ["午","未","申","酉","戌","亥","子","丑","寅","卯","辰","巳"],  // 九月
  ["巳","午","未","申","酉","戌","亥","子","丑","寅","卯","辰"],  // 十月
  ["辰","巳","午","未","申","酉","戌","亥","子","丑","寅","卯"],  // 十一月
  ["卯","辰","巳","午","未","申","酉","戌","亥","子","丑","寅"],  // 十二月
];

// ✳️ 身宮
function shenFromMing(mingBranch, hourBranch) {
  const idxM = BRANCH.indexOf(mingBranch);
  const idxH = BRANCH.indexOf(hourBranch);
  const offset = (idxH - BRANCH.indexOf("卯") + 12) % 12;
  return BRANCH[(idxM + offset) % 12];
}

// ✳️ 年干推導
function getStemByYear(year) {
  const stems = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  return stems[(year - 4) % 10]; // 甲子年 = 西元4年對應起點
}

// ------------------------------------------------------------
export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method Not Allowed" });

    const { ymd, hourLabel, gender } = req.body || {};
    if (!ymd || !hourLabel)
      return res.status(400).json({ error: "缺少參數" });

    // 🔹 從 /api/lunar 取得農曆月
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (req.headers.host ? `https://${req.headers.host}` : "");
    const lr = await fetch(`${baseUrl}/api/lunar?date=${ymd}`);
    if (!lr.ok) throw new Error(`lunar fetch fail (${lr.status})`);
    const lunar = await lr.json();
    if (lunar.error) throw new Error("lunar fetch fail");

    const monthNo = Number(lunar.month_no);
    const hourBranch = (hourLabel || "").slice(0, 1);
    const hIdx = HOUR_INDEX[hourBranch];
    if (isNaN(monthNo) || hIdx == null)
      return res.status(400).json({ error: "月份或時辰解析失敗" });

    // 🔹 命宮
    const ming_branch = MING_MATRIX[monthNo][hIdx];
    // 🔹 身宮
    const shen_branch = shenFromMing(ming_branch, hourBranch);

    // 🔹 推年干 → 五行局
    const year = Number(ymd.slice(0, 4));
    const stem = getStemByYear(year);
    const foundStem = STEMS.find(s => s.stem === stem);
    const key = foundStem ? foundStem.element + foundStem.yinYang : "木陽";
    const bureau = ELEMENT_TO_BUREAU[key] || "木三局";

    // 🔹 命主 / 身主
    const { ming: ming_lord, shen: shen_lord } = LORDS[bureau] || {};

    // 🔹 命宮主星
    const ming_stars = MING_STARS[ming_branch] || [];

    res.json({
      year,
      stem,
      gender,
      bureau,
      ming_branch,
      shen_branch,
      ming_lord,
      shen_lord,
      ming_stars
    });
  } catch (e) {
    console.error("ziwei-core api error:", e);
    res.status(500).json({ error: "ziwei-core api error" });
  }
}
