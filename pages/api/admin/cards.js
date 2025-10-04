import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "未登入" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: "無效 token" });
  }

  if (req.method === "GET") {
    const keys = await redis.keys("card:*");
    const cards = [];
    for (const k of keys) {
      const str = await redis.get(k);
      if (!str) continue;
      try {
        const obj = JSON.parse(str);
        if (!obj.uid) obj.uid = k.replace("card:", "");
        cards.push(obj);
      } catch (e) {
        console.warn(`⚠️ parse error: ${k}`, e);
      }
    }
    return res.json({ ok: true, cards });
  }

  if (req.method === "POST") {
    const { mode, card, csvText } = req.body || {};
    if (mode === "single" && card) {
      const key = `card:${card.uid}`;
      await redis.set(key, JSON.stringify(card));
      return res.json({ ok: true });
    }
    if (mode === "csv" && csvText) {
      const rows = csvText.trim().split("\n").slice(1);
      let created = 0;
      for (const row of rows) {
        const [uid, birthday, points] = row.split(",");
        if (!uid) continue;
        const card = {
          uid,
          birthday,
          points: Number(points) || 0,
          status: "PENDING",
          updated_at: Date.now(),
        };
        await redis.set(`card:${uid}`, JSON.stringify(card));
        created++;
      }
      return res.json({ ok: true, created });
    }
    return res.status(400).json({ error: "未知操作" });
  }

  if (req.method === "PATCH") {
    const { card } = req.body || {};
    if (!card?.uid) return res.status(400).json({ error: "缺少 UID" });
    const key = `card:${card.uid}`;
    await redis.set(key, JSON.stringify(card));
    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { uid } = req.body || {};
    if (!uid) return res.status(400).json({ error: "缺少 UID" });
    await redis.del(`card:${uid}`);
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
