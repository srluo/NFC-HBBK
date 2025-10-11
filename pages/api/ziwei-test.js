import { solarToLunar } from "../../lib/lunarConverter.js";
import { getZiweiCore } from "../../lib/ziweiCore_v2_safe.js";
export default async function handler(req, res) {
  try {
    const { birthcode } = req.method === "POST" ? req.body : req.query;
    if (!birthcode) return res.status(400).json({ error: "缺少 birthcode 參數" });
    const m = birthcode.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})-([FM])$/);
    if (!m) return res.status(400).json({ error: "格式錯誤，應為 YYYYMMDD-HHmm-F/M" });
    const [, y, M, d, hh, mm, g] = m;
    const lunar = await solarToLunar(+y, +M, +d, +hh, +mm);
    const result = getZiweiCore(lunar, g);
    res.status(200).json({ input: birthcode, parsed: { y, M, d, hh, mm, g }, lunar, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
