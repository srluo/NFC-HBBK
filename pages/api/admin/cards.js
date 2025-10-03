import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

/** 🧭 掃描所有 card:* key（取代 KEYS） */
async function listCards() {
  let cursor = 0;
  const keys = [];
  do {
    const [nextCursor, found] = await redis.scan(cursor, { match: "card:*", count: 100 });
    cursor = Number(nextCursor);
    keys.push(...found);
  } while (cursor !== 0);

  const cards = [];
  for (const key of keys) {
    try {
      const val = await redis.get(key);
      if (val) cards.push(JSON.parse(val));
    } catch (e) {
      console.error("parse error", key, e);
    }
  }
  return cards;
}

/** 驗證管理員 JWT */
function verifyAdmin(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  if (!token) throw new Error("未授權");
  jwt.verify(token, process.env.JWT_SECRET);
}

export default async function handler(req, res) {
  try {
    verifyAdmin(req);
  } catch (e) {
    return res.status(401).json({ error: "未授權" });
  }

  // 📥 取得卡片列表
  if (req.method === "GET") {
    try {
      const cards = await listCards();
      return res.json({ ok: true, cards });
    } catch (e) {
      console.error("list error:", e);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // ➕ 新增卡片（單筆 or CSV）
  if (req.method === "POST") {
    try {
      const { mode, card, csvText } = req.body || {};

      // 單筆新增
      if (mode === "single" && card) {
        const key = `card:${card.uid}`;
        await redis.set(key, JSON.stringify(card));
        return res.json({ ok: true });
      }

      // CSV 批次新增
      if (mode === "csv" && csvText) {
        const lines = csvText.trim().split("\n").slice(1);
        let created = 0;
        for (const line of lines) {
          const [uid, birthday, pointsStr] = line.split(",");
          if (!uid) continue;
          const obj = {
            uid,
            birthday: birthday || "",
            points: Number(pointsStr) || 0,
            status: "PENDING",
          };
          await redis.set(`card:${uid}`, JSON.stringify(obj));
          created++;
        }
        return res.json({ ok: true, created });
      }

      return res.status(400).json({ error: "無效的資料" });
    } catch (e) {
      console.error("post error:", e);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // ✏️ 編輯卡片
  if (req.method === "PATCH") {
    try {
      const { card } = req.body || {};
      if (!card || !card.uid) return res.status(400).json({ error: "缺少 UID" });

      const key = `card:${card.uid}`;
      await redis.set(key, JSON.stringify(card));
      return res.json({ ok: true });
    } catch (e) {
      console.error("patch error:", e);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // 🗑️ 刪除卡片
  if (req.method === "DELETE") {
    try {
      const { uid } = req.body || {};
      if (!uid) return res.status(400).json({ error: "缺少 UID" });
      await redis.del(`card:${uid}`);
      return res.json({ ok: true });
    } catch (e) {
      console.error("delete error:", e);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
