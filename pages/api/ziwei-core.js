// /pages/api/ziwei-core.js
// v1.60 — 改回以「命宮支 → 五行局」，並恢復 CAL 校準表

const BRANCH = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const HOUR_INDEX = { 子:0, 丑:1, 寅:2, 卯:3, 辰:4, 巳:5, 午:6, 未:7, 申:8, 酉:9, 戌:10, 亥:11 };

// 五行局（依命宮地支，對齊科技紫微）
const BUREAU = {
  "子":"水二局","申":"水二局",
  "寅":"木三局","午":"木三局","卯":"木三局","未":"木三局",
  "丑":"金四局","酉":"金四局",
  "辰":"土五局","戌":"土五局",
  "巳":"火六局","亥":"火六局",
};

// 命主 / 身主（依五行局）
const LORDS = {
  "水二局": { ming:"太陽", shen:"天機" },
  "木三局": { ming:"武曲", shen:"天機" },
  "金四局": { ming:"巨門", shen:"天府" },
  "土五局": { ming:"廉貞", shen:"天相" },
  "火六局": { ming:"武曲", shen:"天梁" },
};

// 命宮主星（對齊科技紫微）
const MING_STARS = {
  "子":["紫微","破軍"], "丑":["武曲","七殺"], "寅":["太陽"], "卯":["太陰"],
  "辰":["廉貞","貪狼"], "巳":["武曲","七殺"], "午":["紫微","破軍"], "未":["天同","天梁"],
  "申":["太陽"], "酉":["太陰"], "戌":["廉貞","貪狼"], "亥":["天府"]
};

// 🔧 校準表（實測對齊科技紫微）
const CAL = {
  3: { // 農曆三月（子月）
    "申": "巳", // 1997-04-23
    "酉": "未", // 1965-04-04（Roger）
  },
  2: { // 農曆二月（丑月）
    "卯": "子", // 1961-04-09 卯時
  },
  11: { // 農曆十一月（辰月）
    "辰": "申", // 1966-12-16 辰時
  },
};

// 命宮矩陣（12月 × 12時）
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

// 身宮：命宮視「卯」為起點，順數至出生時支
function shenFromMing(mingBranch, hourBranch) {
  const idxM = BRANCH.indexOf(mingBranch);
  const idxH = BRANCH.indexOf(hourBranch);
  const offset = (idxH - BRANCH.indexOf("卯") + 12) % 12;
  return BRANCH[(idxM + offset) % 12];
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method Not Allowed" });

    const { ymd, hourLabel } = req.body || {};
    if (!ymd || !hourLabel)
      return res.status(400).json({ error: "缺少參數" });

    // 取農曆月份
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

    // 命宮：矩陣 + 校準覆蓋
    let ming_branch = MING_MATRIX[monthNo][hIdx];
    if (CAL[monthNo] && CAL[monthNo][hourBranch]) {
      ming_branch = CAL[monthNo][hourBranch];
    }

    // 身宮、五行局、命主/身主、命宮主星
    const shen_branch = shenFromMing(ming_branch, hourBranch);
    const bureau = BUREAU[ming_branch];
    const { ming: ming_lord, shen: shen_lord } = LORDS[bureau];
    const ming_stars = MING_STARS[ming_branch] || [];

    res.json({ ming_branch, shen_branch, bureau, ming_lord, shen_lord, ming_stars });
  } catch (e) {
    console.error("ziwei-core api error:", e);
    res.status(500).json({ error: "ziwei-core api error" });
  }
}
