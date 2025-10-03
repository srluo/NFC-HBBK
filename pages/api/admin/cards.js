import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ 驗證管理員 Token
function verifyAdmin(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

// ✅ 使用 SCAN 來取代 KEYS，避免 Upstash 無法使用 KEYS 指令
async function listCards() {
  const cards = [];
  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: "card:*", count: 100 });
    cursor = Number(nextCursor);
    for (const key of keys) {
      const val = await redis.get(key);
      if (!val) continue;
      try {
        cards.push(JSON.parse(val));
      } catch (e) {
        console.error("JSON parse error:", key, e);
      }
    }
  } while (cursor !== 0);
  return cards;
}

export default async function handler(req, res) {
  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: "未授權" });
  }

  const { method } = req;

  // 📌 讀取所有卡片資料
  if (method === "GET") {
    try {
      const cards = await listCards();
      return res.json({ ok: true, cards });
    } catch (err) {
      console.error("admin/cards fatal:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // 📌 新增卡片（單筆 or CSV）
  if (method === "POST") {
    try {
      const body = req.body;

      // 📝 批次 CSV 匯入
      if (body.mode === "csv") {
        const lines = body.csvText.trim().split("\n").slice(1);
        let created = 0;
        for (const line of lines) {
          const [uid, birthday, points] = line.split(",");
          if (!uid) continue;
          const card = {
            uid,
            birthday,
            points: Number(points) || 0,
            status: "PENDING",
          };
          await redis.set(`card:${uid}`, JSON.stringify(card));
          created++;
        }
        return res.json({ ok: true, created });
      }

      // 📝 單筆新增
      if (body.mode === "single") {
        const card = body.card;
        await redis.set(`card:${card.uid}`, JSON.stringify(card));
        return res.json({ ok: true });
      }

      return res.status(400).json({ error: "無效的 mode" });
    } catch (err) {
      console.error("POST /admin/cards fatal:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // 📌 修改卡片
  if (method === "PATCH") {
    try {
      const { card } = req.body;
      await redis.set(`card:${card.uid}`, JSON.stringify(card));
      return res.json({ ok: true });
    } catch (err) {
      console.error("PATCH /admin/cards fatal:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // 📌 刪除卡片
  if (method === "DELETE") {
    try {
      const { uid } = req.body;
      await redis.del(`card:${uid}`);
      return res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /admin/cards fatal:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  res.status(405).json({ error: "Method not allowed" });
}
