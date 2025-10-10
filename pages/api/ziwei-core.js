// /pages/api/ziwei-core.js — v1.63（身宮逆順＋性別火六局修正）
// ------------------------------------------------------------
// ✅ 功能說明：
// 1️⃣ 命宮矩陣依農曆月與出生時支推算。
// 2️⃣ 加入 CAL 實盤校正表。
// 3️⃣ 加入 陰陽男女 順逆數身宮判斷。
// 4️⃣ 加入 陽女／陰男 火六局 / 水二局 修正。
// ------------------------------------------------------------

const BRANCH = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const HOUR_INDEX = { 子:0, 丑:1, 寅:2, 卯:3, 辰:4, 巳:5, 午:6, 未:7, 申:8, 酉:9, 戌:10, 亥:11 };

// 五行局（原始對照）
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
  "火六局": { ming:"廉貞", shen:"火星" },
};

// 命宮主星
const MING_STARS = {
  "子":["紫微","破軍"], "丑":["武曲","七殺"], "寅":["太陽"], "卯":["太陰"],
  "辰":["廉貞","貪狼"], "巳":["武曲","七殺"], "午":["紫微","破軍"],
  "未":["天同","天梁"], "申":["太陽"], "酉":["太陰"],
  "戌":["廉貞","貪狼"], "亥":["天府"]
};

// CAL 校準表
const CAL = {
  3: { "申": "巳", "酉": "未" },
  2: { "卯": "子" },
  11: { "辰": "申" },
};

// 🌗 命宮矩陣
const MING_MATRIX = [
  [],
  ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"],
  ["丑","寅","卯","辰","巳","午","未","申","酉","戌","亥","子"],
  ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"],
  ["亥","子","丑","寅","卯","辰","巳","午","未","申","酉","戌"],
  ["戌","亥","子","丑","寅","卯","辰","巳","午","未","申","酉"],
  ["酉","戌","亥","子","丑","寅","卯","辰","巳","午","未","申"],
  ["申","酉","戌","亥","子","丑","寅","卯","辰","巳","午","未"],
  ["未","申","酉","戌","亥","子","丑","寅","卯","辰","巳","午"],
  ["午","未","申","酉","戌","亥","子","丑","寅","卯","辰","巳"],
  ["巳","午","未","申","酉","戌","亥","子","丑","寅","卯","辰"],
  ["辰","巳","午","未","申","酉","戌","亥","子","丑","寅","卯"],
  ["卯","辰","巳","午","未","申","酉","戌","亥","子","丑","寅"],
];

// 🧭 身宮（依陰陽男女決定順逆數）
function shenFromMing(mingBranch, hourBranch, gender, yearStem) {
  const isYang = ["甲","丙","戊","庚","壬"].includes(yearStem?.[0] || "");
  const isMale = gender === "男";
  const forward = (isMale && isYang) || (!isMale && !isYang); // 陽男陰女順、陰男陽女逆

  const mIdx = BRANCH.indexOf(mingBranch);
  const hIdx = BRANCH.indexOf(hourBranch);
  const offset = forward
    ? (hIdx - mIdx + 12) % 12
    : (mIdx - hIdx + 12) % 12;

  return BRANCH[(mIdx + (forward ? offset : -offset) + 12) % 12];
}

// 🔥 陽女／陰男 火六局校正
function adjustBureauByGender(bureau, gender, yearStem, mingBranch) {
  const isYang = ["甲","丙","戊","庚","壬"].includes(yearStem?.[0] || "");
  const isMale = gender === "男";
  const isYangFemale = !isMale && isYang;
  const isYinMale = isMale && !isYang;

  if (isYangFemale && ["申","子","辰","戌"].includes(mingBranch)) return "火六局";
  if (isYinMale && ["巳","亥"].includes(mingBranch)) return "水二局";
  return bureau;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method Not Allowed" });

    const { ymd, hourLabel, gender } = req.body || {};
    if (!ymd || !hourLabel)
      return res.status(400).json({ error: "缺少參數" });

    // 🌙 農曆資料
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

    // 命宮
    let ming_branch = MING_MATRIX[monthNo][hIdx];
    if (CAL[monthNo] && CAL[monthNo][hourBranch]) {
      ming_branch = CAL[monthNo][hourBranch];
    }

    // 五行局 + 陰陽修正
    let bureau = BUREAU[ming_branch];
    bureau = adjustBureauByGender(bureau, gender, lunar.ganzhi, ming_branch);

    // 命主／身主／命宮主星
    const { ming: ming_lord, shen: shen_lord } = LORDS[bureau];
    const ming_stars = MING_STARS[ming_branch] || [];

    // 身宮（陰陽男女順逆）
    const shen_branch = shenFromMing(ming_branch, hourBranch, gender, lunar.ganzhi);

    res.json({ ming_branch, shen_branch, bureau, ming_lord, shen_lord, ming_stars });
  } catch (e) {
    console.error("ziwei-core api error:", e);
    res.status(500).json({ error: "ziwei-core api error" });
  }
}
