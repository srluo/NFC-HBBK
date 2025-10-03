import jwt from "jsonwebtoken";
import { redis } from "../../../lib/redis";

export default async function handler(req, res) {
  // ✅ 驗證 Token
  const auth = req.headers.authorization;
  const token = auth && auth.split(" ")[1];
  if (!token) return res.status(401).json({ error: "未授權" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "未授權" });
  }

  // ✅ 取得所有卡片資料
  if (req.method === "GET") {
    const keys = await redis.keys("card:*");
    const cards = [];
    for (const key of keys) {
      const val = await redis.get(key);
      if (val) {
        try {
          cards.push(JSON.parse(val));
        } catch {
          // 若不是 JSON，嘗試 hash
          const hash = await redis.hgetall(key);
          if (hash && Object.keys(hash).length > 0) cards.push(hash);
        }
      }
    }
    return res.json({ ok: true, cards });
  }

  // ✅ 新增或更新卡片資料
  if (req.method === "POST" || req.method === "PATCH") {
    const { mode, card, csvText } = req.body || {};

    if (mode === "csv" && csvText) {
      const lines = csvText.trim().split("\n").slice(1); // 去掉標題列
      let created = 0;
      for (const line of lines) {
        const [uid, birthday, points] = line.split(",");
        if (!uid) continue;
        const obj = {
          uid,
          birthday,
          points: Number(points || 0),
          status: "PENDING",
          last_seen: "",
        };
        await redis.set(`card:${uid}`, JSON.stringify(obj));
        created++;
      }
      return res.json({ ok: true, created });
    }

    if (mode === "single" && card) {
      await redis.set(`card:${card.uid}`, JSON.stringify(card));
      return res.json({ ok: true });
    }

    if (mode === "patch" && card) {
      const existing = await redis.get(`card:${card.uid}`);
      let obj = existing ? JSON.parse(existing) : {};
      obj = { ...obj, ...card };
      await redis.set(`card:${card.uid}`, JSON.stringify(obj));
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: "無效的請求" });
  }

  // ✅ 刪除卡片
  if (req.method === "DELETE") {
    const { uid } = req.body || {};
    if (!uid) return res.status(400).json({ error: "缺少 UID" });
    await redis.del(`card:${uid}`);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
