// /lib/lunarConverter.js — v3.9.3
import Lunar from "./lunar.js";

const hourBranchMap = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// 正確的西洋星座界線（含起迄日）
function getConstellation(m, d) {
  const md = m * 100 + d;
  if (md >= 321 && md <= 419)  return "牡羊座";
  if (md >= 420 && md <= 520)  return "金牛座";
  if (md >= 521 && md <= 621)  return "雙子座";
  if (md >= 622 && md <= 722)  return "巨蟹座";
  if (md >= 723 && md <= 822)  return "獅子座";
  if (md >= 823 && md <= 922)  return "處女座";
  if (md >= 923 && md <= 1023) return "天秤座";
  if (md >= 1024 && md <= 1122) return "天蠍座";
  if (md >= 1123 && md <= 1221) return "射手座";
  if ((md >= 1222 && md <= 1231) || (md >= 101 && md <= 119)) return "摩羯座";
  if (md >= 120 && md <= 218)  return "水瓶座";
  return "雙魚座"; // 2/19–3/20
}

// 只做西曆→農曆；不傳回時支（因為沒有出生時間）
export async function solarToLunar(year, month, day, hour = 0, minute = 0) {
  if (typeof Lunar !== "function") throw new Error("❌ 缺少 lunar.js 轉換核心");

  if (typeof globalThis._ein_solar === "object") {
    globalThis._ein_solar.h = hour;
  } else {
    globalThis.solar = { y: year, m: month, d: day, h: hour };
  }

  Lunar(0, year, month, day);

  const g  = globalThis._ein_gan;
  const zh = globalThis._ein_zhi;
  const lun = globalThis._ein_lunar || {};

  const safeMonth = lun.m ?? globalThis.solar?.m ?? month;
  const safeDay   = lun.d ?? globalThis.solar?.d ?? day;

  const year_ganzhi =
    (globalThis.GanGB && g && zh)
      ? `${globalThis.GanGB[g.y]}${globalThis.ZhiGB[zh.y]}`
      : "";

  return {
    year_ganzhi,
    month: safeMonth,
    day: safeDay,
    // 不回傳 hour_branch，因為此函式沒有接受出生時間的責任
  };
}

// 封裝：給 fortuneCore 用（依西曆日期推生肖/星座）
export async function getLunarInfo(ymd) {
  if (!ymd || ymd.length !== 8) throw new Error("❌ 缺少 ymd (YYYYMMDD)");
  const y = parseInt(ymd.slice(0, 4), 10);
  const m = parseInt(ymd.slice(4, 6), 10);
  const d = parseInt(ymd.slice(6, 8), 10);

  // 中午換日避免邊界，但不取時支
  const lunar = await solarToLunar(y, m, d, 12, 0);

  const zodiacs = ["鼠","牛","虎","兔","龍","蛇","馬","羊","猴","雞","狗","豬"];
  const zodiac = zodiacs[(y - 4) % 12];

  const constellation = getConstellation(m, d);

  return {
    lunar_birthday: `${y}-${lunar.month}-${lunar.day}`,
    zodiac,
    constellation,
    year_ganzhi: lunar.year_ganzhi || "",
    lunar_month: lunar.month,
    lunar_day: lunar.day,
    // 不回傳 hour_branch
  };
}