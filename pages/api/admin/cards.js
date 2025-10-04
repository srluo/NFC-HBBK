import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "未登入" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "無效 token" });
  }

  // 讀取全部
  if (req.method === "GET") {
    const keys = await redis.keys("card:*");
    const cards = [];
    for (const k of keys) {
      const hash = await redis.hgetall(k);
      if (Object.keys(hash).length > 0) cards.push(hash);
    }
    return res.json({ ok: true, cards });
  }

  // 新增 / 批次匯入 / 編輯
  if (req.method === "POST" || req.method === "PATCH") {
    const { mode, card, csvText } = req.body || {};
    if (mode === "single" || mode === "patch") {
      if (!card?.uid) return res.status(400).json({ error: "缺少 UID" });
      await redis.hset(`card:${card.uid}`, card);
      return res.json({ ok: true });
    }
    if (mode === "csv" && csvText) {
      const lines = csvText.trim().split("\n").slice(1);
      let created = 0;
      for (const line of lines) {
        const [uid, birthday, points] = line.split(",");
        if (!uid) continue;
        await redis.hset(`card:${uid}`, { uid, birthday, points, status: "PENDING" });
        created++;
      }
      return res.json({ ok: true, created });
    }
  }

  // 刪除
  if (req.method === "DELETE") {
    const { uid } = req.body || {};
    if (!uid) return res.status(400).json({ error: "缺少 UID" });
    await redis.del(`card:${uid}`);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
