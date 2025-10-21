// ------------------------------------------------------------
// /lib/fourPillars.js — v4.6.1-final (JieqiFix)
// ------------------------------------------------------------
// ✅ 修正節氣月誤判 (1965-04-04 → 己卯月)
// ✅ 強化 Date +08:00 解析 (避免 UTC 誤差)
// ✅ 確保 jieqi.json 匯入後能正確比對
// ------------------------------------------------------------

import jieqiTable from "../data/jieqi.json" with { type: "json" };

// 天干、地支
const gan = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const zhi = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// 五虎遁月起點（依年干）
const tigerMonthMap = {
  甲:"丙寅", 乙:"戊寅", 丙:"庚寅", 丁:"壬寅",
  戊:"甲寅", 己:"丙寅", 庚:"戊寅", 辛:"庚寅",
  壬:"壬寅", 癸:"甲寅"
};

// 五鼠遁時起點（依日干）
const ratHourStart = {
  甲:0, 己:0, 乙:2, 庚:2, 丙:4, 辛:4, 丁:6, 壬:6, 戊:8, 癸:8
};

// 12 節氣月首對照表
const MONTH_HEADS = [
  { name: "立春", idx: 1 },
  { name: "驚蟄", idx: 2 },
  { name: "清明", idx: 3 },
  { name: "立夏", idx: 4 },
  { name: "芒種", idx: 5 },
  { name: "小暑", idx: 6 },
  { name: "立秋", idx: 7 },
  { name: "白露", idx: 8 },
  { name: "寒露", idx: 9 },
  { name: "立冬", idx: 10 },
  { name: "大雪", idx: 11 },
  { name: "小寒", idx: 12 },
];

// 安全建立固定時區日期 (+08:00)
function makeDateLocal(dateStr) {
  // jieqi.json 已含 "+08:00"，但確保無誤
  return new Date(dateStr.replace(" ", "T"));
}

function combineGanZhi(ganIdx, zhiIdx) {
  return gan[(ganIdx % 10 + 10) % 10] + zhi[(zhiIdx % 12 + 12) % 12];
}

// ------------------------------------------------------------
// 🧭 節氣月判斷
// ------------------------------------------------------------
export function getJieqiMonthIndex(ymd, { debug = false } = {}) {
  const year = parseInt(ymd.slice(0, 4), 10);
  const m = parseInt(ymd.slice(4, 6), 10);
  const d = parseInt(ymd.slice(6, 8), 10);
  const target = new Date(`${year}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}T12:00:00+08:00`);

  const raw = jieqiTable[String(year)];
  if (!raw) {
    if (debug) console.warn(`⚠️ jieqiTable 無年份：${year}，預設 12`);
    return 12;
  }

  // 轉換節氣表為陣列
  const list = Object.entries(raw).map(([name, date]) => ({
    name,
    date: makeDateLocal(date)
  }));

  // 抓取 12 月首節氣
  const heads = MONTH_HEADS.map(({ name, idx }) => {
    const found = list.find(i => i.name === name);
    return found ? { idx, name, date: found.date } : null;
  }).filter(Boolean).sort((a,b) => a.date - b.date);

  let monthIdx = 12; // 預設小寒前＝上一年
  for (const h of heads) {
    if (target >= h.date) monthIdx = h.idx;
    else break;
  }

  if (debug) {
    console.log("🧮 getJieqiMonthIndex",
      ymd,
      "→",
      monthIdx,
      heads.map(h => `${h.idx}:${h.name}@${h.date.toISOString().slice(0,10)}`).join(" | ")
    );
  }
  return monthIdx;
}

// ------------------------------------------------------------
// 🪐 八字四柱推算（節氣月制）
// ------------------------------------------------------------
export function getFourPillars_Jieqi({ year_ganzhi, month, day, hour_branch, ymd, debug = false }) {
  if (!year_ganzhi) throw new Error("❌ 缺少 year_ganzhi");
  if (!ymd) throw new Error("❌ 缺少 ymd");

  const yearGan = year_ganzhi[0];
  const year_pillar = year_ganzhi;

  // 節氣月推算
  const jieqiMonth = getJieqiMonthIndex(ymd, { debug });

  // 🐅 五虎遁月
  const tigerBase = tigerMonthMap[yearGan];
  const baseGanIdx = gan.indexOf(tigerBase[0]);
  const baseZhiIdx = zhi.indexOf(tigerBase[1]);
  const tigerOffset = jieqiMonth - 1;
  const month_pillar = combineGanZhi(baseGanIdx + tigerOffset, baseZhiIdx + tigerOffset);

  // 🌗 日柱（簡化）
  const daySum = parseInt(month) * 30 + parseInt(day) + gan.indexOf(yearGan);
  const dayGanIdx = daySum % 10;
  const dayZhiIdx = (daySum + 2) % 12;
  const day_pillar = combineGanZhi(dayGanIdx, dayZhiIdx);

  // 🕕 五鼠遁時
  const dayGan = gan[dayGanIdx];
  const startGanIdx = ratHourStart[dayGan] ?? 0;
  const hourIdx = zhi.indexOf(hour_branch);
  const hour_pillar = combineGanZhi(startGanIdx + hourIdx, hourIdx);

  const result = {
    year: year_pillar,
    month: month_pillar,
    day: day_pillar,
    hour: hour_pillar,
    jieqi_month: jieqiMonth,
  };

  if (debug) console.log("🪐 八字四柱結果:", result);
  return result;
}