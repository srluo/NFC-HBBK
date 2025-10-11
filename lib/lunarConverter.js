import Lunar from "./lunar.js";

const hourBranchMap = [
  "子","丑","寅","卯","辰","巳",
  "午","未","申","酉","戌","亥"
];

export async function solarToLunar(year, month, day, hour = 0, minute = 0) {
  const lunar = new Lunar(0, year, month, day, hour);
  const hIndex = (hour === 23 || hour === 0)
    ? 0
    : Math.floor((hour + 1) / 2) % 12;

  return {
    year_ganzhi: lunar.gzYear,
    month: lunar.m,
    day: lunar.d,
    hour_branch: hourBranchMap[hIndex],
  };
}
