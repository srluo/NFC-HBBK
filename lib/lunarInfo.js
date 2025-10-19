// /lib/lunarInfo.js — v1.4.1-stable (Einstein 核心版)
// 🧮 封裝 Einstein lunar.js，取回農曆、生肖、星座、干支 + 四柱所需欄位
// ------------------------------------------------------------
// 🔹 輸入：YYYYMMDD (string)
// 🔹 輸出：{ lunar_birthday, zodiac, constellation, year_ganzhi, lunar_month, lunar_day }

import Lunar from "./lunar.js";

// 🌟 星座判斷表（對應日期區間）
const CONSTELLATIONS = [
  ["摩羯座", 120],
  ["水瓶座", 219],
  ["雙魚座", 320],
  ["牡羊座", 420],
  ["金牛座", 521],
  ["雙子座", 621],
  ["巨蟹座", 722],
  ["獅子座", 823],
  ["處女座", 923],
  ["天秤座", 1023],
  ["天蠍座", 1122],
  ["射手座", 1221],
  ["摩羯座", 1231],
];

export function getLunarInfo(dateStr) {
  try {
    if (!dateStr || dateStr.length !== 8) {
      return {
        lunar_birthday: "",
        zodiac: "",
        constellation: "",
        year_ganzhi: "",
        lunar_month: null,
        lunar_day: null,
      };
    }

    // 🧩 拆解年月日
    const y = parseInt(dateStr.slice(0, 4), 10);
    const m = parseInt(dateStr.slice(4, 6), 10);
    const d = parseInt(dateStr.slice(6, 8), 10);

    // 🚀 執行 Einstein 陽轉陰
    Lunar(0, y, m, d);

    const lunar = globalThis._ein_lunar || {};
    const zhi = globalThis._ein_zhi || {};
    const gan = globalThis._ein_gan || {};

    // 🐉 生肖
    const zodiac = globalThis.ShengXiaoGB
      ? globalThis.ShengXiaoGB[zhi.y]
      : "";

    // 🌟 星座
    const md = m * 100 + d;
    const constellation =
      CONSTELLATIONS.find(([_, edge]) => md <= edge)?.[0] || "摩羯座";

    // 🎋 干支（年柱）
    const year_ganzhi =
      globalThis.GanGB && globalThis.ZhiGB
        ? `${globalThis.GanGB[gan.y]}${globalThis.ZhiGB[zhi.y]}`
        : "";

    // 🏮 組合
    const lunar_birthday = `${lunar.y}-${lunar.m}-${lunar.d}`;

    // ✅ 加入四柱所需欄位
    const lunar_month = lunar.m;
    const lunar_day = lunar.d;

    return {
      lunar_birthday,
      zodiac,
      constellation,
      year_ganzhi,
      lunar_month,
      lunar_day,
    };
  } catch (err) {
    console.error("❌ getLunarInfo error:", err);
    return {
      lunar_birthday: "",
      zodiac: "",
      constellation: "",
      year_ganzhi: "",
      lunar_month: null,
      lunar_day: null,
    };
  }
}