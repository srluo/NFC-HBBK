import Lunar from "./lunar.js";

const hourBranchMap = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

export async function solarToLunar(year, month, day, hour = 0, minute = 0) {
  // 先把小時寫進 Einstein 版所用的全域 solar.h
  if (typeof globalThis._ein_solar === "object") {
    globalThis._ein_solar.h = hour;       // ✅ 正確傳入時辰
  } else if (typeof globalThis !== "undefined") {
    // 若初次載入，仍可先放一個殼；Lunar() 會覆寫 y/m/d，但不會動 h
    globalThis.solar = { y: year, m: month, d: day, h: hour };
  }

  // 進行陽→陰換算（會更新 _ein_lunar / _ein_gan / _ein_zhi）
  Lunar(0, year, month, day);

  const g  = globalThis._ein_gan;
  const zh = globalThis._ein_zhi;
  const lun = globalThis._ein_lunar;

  // 保險：若 zh.h 還沒被賦值，就用小時推時支
  const hIndex = (hour === 23 || hour === 0) ? 0 : Math.floor((hour + 1) / 2) % 12;
  const hour_branch = (zh && zh.h != null) ? globalThis.ZhiGB[zh.h] : hourBranchMap[hIndex];

  // 年干支
  const year_ganzhi =
    (globalThis.GanGB && g) && (globalThis.ZhiGB && zh)
      ? `${globalThis.GanGB[g.y]}${globalThis.ZhiGB[zh.y]}`
      : "";

  return {
    year_ganzhi,         // 例如 "乙巳"
    month: lun?.m ?? null,
    day:   lun?.d ?? null,
    hour_branch          // 例如 18:30 應為 "酉"
  };
}
