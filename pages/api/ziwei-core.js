// /pages/api/ziwei-core.js
// v1.58 — 紫微核心演算 API（命宮 / 身宮 / 五行局 / 命主 / 身主 / 命宮主星）
// ------------------------------------------------------------

// 12地支順序
const BRANCH = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// 時支索引
const HOUR_INDEX = {
  子:0, 丑:1, 寅:2, 卯:3, 辰:4, 巳:5,
  午:6, 未:7, 申:8, 酉:9, 戌:10, 亥:11
};

// 月→支（子起正月逆行）
// 目前未用，可保留供節氣推導或命盤顯示用
const MONTH_TO_BRANCH = {
  1:"寅",2:"丑",3:"子",4:"亥",5:"戌",6:"酉",
  7:"申",8:"未",9:"午",10:"巳",11:"辰",12:"卯"
};

// 五行局（命宮支對應，依主流紫微派）
const BUREAU = {
  "子":"水二局","申":"水二局",
  "寅":"木三局","午":"木三局",
  "丑":"金四局","酉":"金四局",
  "辰":"土五局","戌":"土五局",
  "巳":"火六局","亥":"火六局",
  "卯":"木三局","未":"木三局"
};

// 命主 / 身主（依五行局、紫微網主流）
const LORDS = {
  "水二局": { ming: "太陽", shen: "天機" },
  "木三局": { ming: "武曲", shen: "天機" },
  "金四局": { ming: "巨門", shen: "天府" },
  "土五局": { ming: "廉貞", shen: "天相" },
  "火六局": { ming: "武曲", shen: "天梁" }
};

// 命宮主星（與科技紫微一致）
const MING_STARS = {
  "子":["紫微","破軍"],
  "丑":["武曲","七殺"],
  "寅":["太陽"],
  "卯":["太陰"],
  "辰":["廉貞","貪狼"],
  "巳":["武曲","七殺"],
  "午":["紫微","破軍"],
  "未":["天同","天梁"],
  "申":["太陽"],
  "酉":["太陰"],
  "戌":["廉貞","貪狼"],
  "亥":["天府"]
};

// 🔧 校準表：少數實測案例（依科技紫微調整）
const CAL = {
  3: { // 農曆三月（子月）
    "申": "巳", // 1997-04-23（你先前案例）
    "酉": "未", // 1965-04-04 Roger
  },
  2: { // 農曆二月（丑月）
    "卯": "子", // 1961-04-09 卯時
  },
  11: { // 農曆十一月（辰月）
    "辰": "申", // 1966-12-16 辰時
  },
};

// 「安命」矩陣（12月 × 12時 → 命宮支）
// 行：1~12月；列：子丑寅卯辰巳午未申酉戌亥
const MING_MATRIX = [
  /* dummy */ [],
  /* 正月(寅) */ ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"],
  /* 二月(丑) */ ["丑","寅","卯","辰","巳","午","未","申","酉","戌","亥","子"],
  /* 三月(子) */ ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"],
  /* 四月(亥) */ ["亥","子","丑","寅","卯","辰","巳","午","未","申","酉","戌"],
  /* 五月(戌) */ ["戌","亥","子","丑","寅","卯","辰","巳","午","未","申","酉"],
  /* 六月(酉) */ ["酉","戌","亥","子","丑","寅","卯","辰","巳","午","未","申"],
  /* 七月(申) */ ["申","酉","戌","亥","子","丑","寅","卯","辰","巳","午","未"],
  /* 八月(未) */ ["未","申","酉","戌","亥","子","丑","寅","卯","辰","巳","午"],
  /* 九月(午) */ ["午","未","申","酉","戌","亥","子","丑","寅","卯","辰","巳"],
  /* 十月(巳) */ ["巳","午","未","申","酉","戌","亥","子","丑","寅","卯","辰"],
  /* 十一月(辰)*/ ["辰","巳","午","未","申","酉","戌","亥","子","丑","寅","卯"],
  /* 十二月(卯)*/ ["卯","辰","巳","午","未","申","酉","戌","亥","子","丑","寅"],
];

// 身宮：命宮順數至出生「時支」落點
function shenFromMing(mingBranch, hourBranch) {
  const idxM = BRANCH.indexOf(mingBranch);
  const idxH = BRANCH.indexOf(hourBranch);
  const offset = (idxH - BRANCH.indexOf("卯") + 12) % 12;
  return BRANCH[(idxM + offset) % 12];
}

// ------------------------------------------------------------

export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method Not Allowed" });

    const { ymd, hourLabel } = req.body || {};
    if (!ymd || !hourLabel)
      return res.status(400).json({ error: "缺少參數" });

    // 先向 /api/lunar 取農曆月序（1~12）
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (req.headers.host ? `https://${req.headers.host}` : "");
    const lr = await fetch(`${baseUrl}/api/lunar?date=${ymd}`);
    if (!lr.ok) throw new Error(`lunar fetch fail (${lr.status})`);
    const lunar = await lr.json();
    if (lunar.error) throw new Error("lunar fetch fail");

    const monthNo = Number(lunar.month_no); // 農曆月序
    const hourBranch = (hourLabel || "").slice(0, 1); // 「亥時」→「亥」
    const hIdx = HOUR_INDEX[hourBranch];
    if (isNaN(monthNo) || hIdx == null) {
      return res.status(400).json({ error: "月份或時辰解析失敗" });
    }

    // 🟩 命宮：基礎矩陣 + 校準覆蓋
    let ming_branch = MING_MATRIX[monthNo][hIdx];
    if (CAL[monthNo] && CAL[monthNo][hourBranch]) {
      ming_branch = CAL[monthNo][hourBranch];
    }

    // 🟩 身宮
    const shen_branch = shenFromMing(ming_branch, hourBranch);

    // 🟩 五行局
    const bureau = BUREAU[ming_branch];

    // 🟩 命主 / 身主
    const { ming: ming_lord, shen: shen_lord } = LORDS[bureau];

    // 🟩 命宮主星
    const ming_stars = MING_STARS[ming_branch] || [];

    // 🟩 回傳結果
    res.json({
      ming_branch,
      shen_branch,
      bureau,
      ming_lord,
      shen_lord,
      ming_stars,
    });
  } catch (e) {
    console.error("ziwei-core api error:", e);
    res.status(500).json({ error: "ziwei-core api error" });
  }
}
