// /lib/fourPillars.js — v1.5.0-stable
// ------------------------------------------------------------
// 八字四柱計算（簡化版，for lunarInfo.js）
// 不依節氣，僅用農曆年月日時與年干支推導。
// ------------------------------------------------------------

// 天干地支常數
const HeavenlyStems = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const EarthlyBranches = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// ------------------------------------------------------------
// 🧭 主函式：輸入農曆資訊 → 回傳四柱
// lunarObj: { year_ganzhi, month, day, hour_branch }
// ------------------------------------------------------------
export function getFourPillarsFromLunar(lunarObj = {}) {
  const { year_ganzhi, month, day, hour_branch } = lunarObj;
  if (!year_ganzhi || !month || !day || !hour_branch)
    throw new Error("缺少必要參數：year_ganzhi / month / day / hour_branch");

  const yearStem = year_ganzhi[0];
  const yearBranch = year_ganzhi[1];

  const yStemIndex = HeavenlyStems.indexOf(yearStem);
  const yBranchIndex = EarthlyBranches.indexOf(yearBranch);
  if (yStemIndex < 0 || yBranchIndex < 0)
    throw new Error(`干支格式錯誤：${year_ganzhi}`);

  // ------------------------------------------------------------
  // 推算月柱
  // 月干 = (年干 × 2 + 月數) % 10
  // 月支固定 = 正月寅，往後順推
  // ------------------------------------------------------------
  const monthStem = HeavenlyStems[(yStemIndex * 2 + month) % 10];
  const monthBranch = EarthlyBranches[(month + 1) % 12];

  // ------------------------------------------------------------
  // 推算日柱（簡化為表格式循環）
  // 以干支序號總和 mod 60，模擬平均輪替
  // ------------------------------------------------------------
  const dayIndex = ((yStemIndex + month + day) % 10 + 10) % 10;
  const dayStem = HeavenlyStems[dayIndex];
  const dayBranch = EarthlyBranches[(day + yBranchIndex) % 12];

  // ------------------------------------------------------------
  // 推算時柱
  // 時支已知，時干 = (日干序 × 2 + 時支序) % 10
  // ------------------------------------------------------------
  const hBranchIndex = EarthlyBranches.indexOf(hour_branch);
  const hStemIndex = (HeavenlyStems.indexOf(dayStem) * 2 + hBranchIndex) % 10;
  const hourStem = HeavenlyStems[hStemIndex];
  const hourBranch = EarthlyBranches[hBranchIndex];

  return {
    year: `${yearStem}${yearBranch}`,
    month: `${monthStem}${monthBranch}`,
    day: `${dayStem}${dayBranch}`,
    hour: `${hourStem}${hourBranch}`,
  };
}