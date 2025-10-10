// /pages/api/lunar.js — v1.2 修正版（可正確回傳月數與干支）
import solarlunar from "solarlunar";

export default function handler(req, res) {
  try {
    const date = req.query.date;
    if (!date || date.length !== 8) {
      return res.status(400).json({ error: "日期格式錯誤，需 YYYYMMDD" });
    }

    const year = parseInt(date.slice(0, 4), 10);
    const month = parseInt(date.slice(4, 6), 10);
    const day = parseInt(date.slice(6, 8), 10);

    const lunar = solarlunar.solar2lunar(year, month, day);

    res.json({
      lunar: `${lunar.lYear}年${lunar.lMonth}月${lunar.lDay}`,
      month_no: lunar.lMonth,
      ganzhi: lunar.gzYear,
      animal: lunar.Animal,
      is_leap: lunar.isLeap,
      term: lunar.term || "",
    });
  } catch (e) {
    console.error("lunar api error:", e);
    res.status(500).json({ error: "lunar api error" });
  }
}
