// /pages/api/lunar.js
// 後端：代理中研院查表（避免 CORS），並快取到 Redis
import { redis } from "../../lib/redis";

function parseSinica(html) {
  const pick = (re) => (html.match(re) || [])[1]?.trim() || "";
  const lunar = pick(/農曆日期[^：]*：([^<]+)/);
  const ganzhi = pick(/干支[^：]*：([^<]+)/);
  const animal = pick(/生肖[^：]*：([^<]+)/);
  const term = pick(/節氣[^：]*：([^<]+)/);
  const leap = /閏/.test(lunar);
  // 取農曆「幾月幾日」中的月份數字
  const month_no = (() => {
    const m = lunar.match(/([正一二三四五六七八九十冬臘])月/);
    const map = { 正:1, 一:1, 二:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9, 十:10, 冬:11, 臘:12 };
    return m ? (map[m[1]] ?? null) : null;
  })();
  return { lunar, ganzhi, animal, term, is_leap: leap, month_no };
}

export default async function handler(req, res) {
  try {
    const ymd = String(req.query.date || "").slice(0,10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      return res.status(400).json({ error: "bad date" });
    }
    const cacheKey = `lunar:${ymd}`;
    const cached = await redis.hgetall(cacheKey);
    if (cached && Object.keys(cached).length) {
      // 轉型
      return res.json({
        lunar: cached.lunar,
        ganzhi: cached.ganzhi,
        animal: cached.animal,
        term: cached.term,
        is_leap: cached.is_leap === "true",
        month_no: Number(cached.month_no || 0) || null
      });
    }

    const [y,m,d] = ymd.split("-");
    const url = `https://sinocal.sinica.edu.tw/Module/EventHandler.aspx?lang=zh-tw&year=${y}&month=${parseInt(m)}&day=${parseInt(d)}&eventID=1043`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("sinica fetch fail");
    const html = await r.text();
    const data = parseSinica(html);

    await redis.hset(cacheKey, {
      lunar: data.lunar,
      ganzhi: data.ganzhi,
      animal: data.animal,
      term: data.term || "",
      is_leap: data.is_leap ? "true" : "false",
      month_no: String(data.month_no || ""),
      cached_at: Date.now().toString(),
    });

    res.json(data);
  } catch (e) {
    console.error("lunar api error:", e);
    res.status(500).json({ error: "lunar api error" });
  }
}