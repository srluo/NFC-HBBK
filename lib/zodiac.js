import solarlunar from "solarlunar";

const animals = ["鼠","牛","虎","兔","龍","蛇","馬","羊","猴","雞","狗","豬"];
const constellations = [
  { name: "摩羯", from: "1222", to: "0119" },
  { name: "水瓶", from: "0120", to: "0218" },
  { name: "雙魚", from: "0219", to: "0320" },
  { name: "牡羊", from: "0321", to: "0419" },
  { name: "金牛", from: "0420", to: "0520" },
  { name: "雙子", from: "0521", to: "0621" },
  { name: "巨蟹", from: "0622", to: "0722" },
  { name: "獅子", from: "0723", to: "0822" },
  { name: "處女", from: "0823", to: "0922" },
  { name: "天秤", from: "0923", to: "1023" },
  { name: "天蠍", from: "1024", to: "1122" },
  { name: "射手", from: "1123", to: "1221" }
];

export function calcZodiac(dateStr) {
  const y = parseInt(dateStr.slice(0,4),10);
  const m = parseInt(dateStr.slice(4,6),10);
  const d = parseInt(dateStr.slice(6,8),10);
  const lunar = solarlunar.solar2lunar(y, m, d);
  const zodiac = animals[(lunar.lYear - 4) % 12];
  const md = parseInt(dateStr.slice(4,8),10);
  const constellation = constellations.find(c => {
    const from = parseInt(c.from,10);
    const to = parseInt(c.to,10);
    if (from <= to) return md >= from && md <= to;
    return md >= from || md <= to;
  }).name;
  return { lunarDate: `${lunar.lYear}-${lunar.lMonth}-${lunar.lDay}`, zodiac, constellation };
}
