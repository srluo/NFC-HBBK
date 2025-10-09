// /pages/api/lunar.js
import * as solarlunar from "solarlunar";

export default async function handler(req, res) {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: "缺少 date 參數" });
    }

    const [y, m, d] = date.split("-").map(Number);
    const lunar = solarlunar.solar2lunar(y, m, d);

    // 🧭 統一格式，確保屬性存在
    const animal = lunar.Animal || lunar.animal || "";
    const term = lunar.Term || lunar.term || "";
    const gzYear = lunar.gzYear || lunar.gz_year || "";
    const month_no = lunar.lMonth || lunar.lunarMonth || 0;

    return res.json({
      lunar: `${lunar.lYear}年${lunar.lMonth}月${lunar.lDay}`,
      ganzhi: gzYear,
      animal,
      term,
      is_leap: lunar.isLeap,
      month_no,
    });
  } catch (err) {
    console.error("❌ lunar api error:", err);
    return res.status(500).json({ error: "lunar api error" });
  }
}
