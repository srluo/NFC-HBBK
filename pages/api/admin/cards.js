import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const token = auth.split(" ")[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

async function listCards() {
  const keys = await redis.keys("card:*");
  const results = [];
  for (const key of keys) {
    const val = await redis.get(key);
    if (val) {
      try {
        results.push(JSON.parse(val));
      } catch {
        // fallback hash
        const h = await redis.hgetall(key);
        results.push(h);
      }
    }
  }
  return results;
}

export default async function handler(req, res) {
  const user = verifyToken(req);
  if (!user) return res.status(401).json({ error: "未授權" });

  try {
    if (req.method === "GET") {
      const cards = await listCards();
      return res.json({ ok: true, cards });
    }

    if (req.method === "POST") {
      const { mode, csvText, card } = req.body;

      // ✅ 批次匯入 CSV
      if (mode === "csv") {
        const lines = csvText.trim().split("\n").slice(1); // 去掉 header
        let count = 0;
        for (const line of lines) {
          const [uid, birthday, pointsStr] = line.split(",");
          if (!uid) continue;
          const key = `card:${uid}`;
          const obj = {
            uid,
            birthday,
            status: "PENDING",
            points: Number(pointsStr) || 0,
          };
          await redis.set(key, JSON.stringify(obj));
          count++;
        }
        return res.json({ ok: true, created: count });
      }

      // ✅ 單筆新增
      if (mode === "single" && card) {
        const key = `card:${card.uid}`;
        await redis.set(key, JSON.stringify(card));
        return res.json({ ok: true });
      }

      return res.status(400).json({ error: "不支援的操作模式" });
    }

    if (req.method === "PATCH") {
      const { card } = req.body;
      if (!card || !card.uid) return res.status(400).json({ error: "缺少 uid" });
      const key = `card:${card.uid}`;
      await redis.set(key, JSON.stringify(card));
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: "缺少 uid" });
      await redis.del(`card:${uid}`);
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (err) {
    console.error("admin/cards fatal:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
