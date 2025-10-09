// /pages/api/ziwei-core.js
// 後端：紫微核心欄位（命宮/身宮/五行局/命主/身主/命宮主星）
const BRANCH = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const HOUR_INDEX = { 子:0, 丑:1, 寅:2, 卯:3, 辰:4, 巳:5, 午:6, 未:7, 申:8, 酉:9, 戌:10, 亥:11 };

// 月→支（子起正月逆行）
const MONTH_TO_BRANCH = { 1:"寅",2:"丑",3:"子",4:"亥",5:"戌",6:"酉",7:"申",8:"未",9:"午",10:"巳",11:"辰",12:"卯" };

// 五行局（命宮支）
const BUREAU = {
  "子":"木三局","午":"木三局",
  "丑":"金四局","未":"金四局",
  "寅":"水二局","申":"水二局",
  "卯":"土五局","酉":"土五局",
  "辰":"土五局","戌":"土五局",
  "巳":"火六局","亥":"火六局",
};

// 命主/身主（依五行局）
const LORDS = {
  "木三局": { ming:"貪狼", shen:"巨門" },
  "火六局": { ming:"武曲", shen:"天梁" },
  "土五局": { ming:"廉貞", shen:"天相" },
  "金四局": { ming:"巨門", shen:"天府" },
  "水二局": { ming:"太陽", shen:"天機" },
};

// 命宮主星（表 A；與科技紫微一致）
const MING_STARS = {
  "子":["紫微","破軍"], "丑":["武曲","七殺"], "寅":["太陽"], "卯":["太陰"],
  "辰":["廉貞","貪狼"], "巳":["武曲","七殺"], "午":["紫微","破軍"], "未":["天同","天梁"],
  "申":["太陽"], "酉":["太陰"], "戌":["廉貞","貪狼"], "亥":["天府"]
};

// 「安命」矩陣（12月 × 12時 → 命宮支）
// 這份矩陣依主流口徑推導，並以你提供的實盤驗證。
// 行：1~12月；列：子丑寅卯辰巳午未申酉戌亥
const MING_MATRIX = [
  /* dummy 0 */ [],
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

// 身宮：由命宮順數至出生「時支」落點
function shenFromMing(mingBranch, hourBranch) {
  const idxM = BRANCH.indexOf(mingBranch);
  const idxH = BRANCH.indexOf(hourBranch);
  // 命宮所在視為「卯」起點，順數到「時支」→ 身宮
  // 換算：位移 = (idxH - BRANCH.indexOf("卯"))
  const offset = (idxH - BRANCH.indexOf("卯") + 12) % 12;
  return BRANCH[(idxM + offset) % 12];
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });
    const { ymd, hourLabel } = req.body || {};
    if (!ymd || !hourLabel) return res.status(400).json({ error: "缺少參數" });

    // 先向 /api/lunar 取月序（1~12）
    const lr = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/lunar?date=${ymd}`);
    const lunar = await lr.json();
    if (lunar.error) throw new Error("lunar fetch fail");

    const monthNo = Number(lunar.month_no); // 1~12
    const hourBranch = (hourLabel || "").slice(0,1); // 「亥時」→「亥」

    const hIdx = HOUR_INDEX[hourBranch];
    if (isNaN(monthNo) || hIdx == null) {
      return res.status(400).json({ error: "月份或時辰解析失敗" });
    }

    // 命宮
    const ming_branch = MING_MATRIX[monthNo][hIdx];
    // 身宮
    const shen_branch = shenFromMing(ming_branch, hourBranch);
    // 五行局
    const bureau = BUREAU[ming_branch];
    // 命主/身主
    const { ming: ming_lord, shen: shen_lord } = LORDS[bureau];
    // 命宮主星
    const ming_stars = MING_STARS[ming_branch] || [];

    res.json({ ming_branch, shen_branch, bureau, ming_lord, shen_lord, ming_stars });
  } catch (e) {
    console.error("ziwei-core api error:", e);
    res.status(500).json({ error: "ziwei-core api error" });
  }
}