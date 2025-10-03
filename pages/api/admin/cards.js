// /pages/api/admin/cards.js
import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  // 🔐 驗證管理員 JWT
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "未授權" });
  const token = auth.replace("Bearer ", "");
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: "Token 無效" });
  }

  const keyPrefix = "card:";

  try {
    // 📋 讀取所有卡片
    if (req.method === "GET") {
      const keys = await redis.keys(`${keyPrefix}*`);
      const cards = [];
      for (const k of keys) {
        const val = await redis.get(k);
        if (!val) continue;
        try {
          const obj = JSON.parse(val);
          cards.push(obj);
        } catch {
          // 若是 hash fallback
          const hash = await redis.hgetall(k);
          if (hash && Object.keys(hash).length > 0) cards.push(hash);
        }
      }
      return res.json({ ok: true, cards });
    }

    // ➕ 新增單張 or 批次匯入
    if (req.method === "POST") {
      const { mode } = req.body;

      if (mode === "single") {
        const { card } = req.body;
        if (!card.uid) return res.status(400).json({ error: "缺少 UID" });
        await redis.set(`${keyPrefix}${card.uid}`, JSON.stringify(card));
        return res.json({ ok: true });
      }

      if (mode === "csv") {
        const { csvText } = req.body;
        if (!csvText) return res.status(400).json({ error: "缺少 CSV" });
        const lines = csvText.trim().split("\n");
        let created = 0;
        for (let i = 1; i < lines.length; i++) {
          const [uid, birthday, points] = lines[i].split(",");
          if (!uid) continue;
          const card = {
            uid,
            birthday,
            points: Number(points) || 0,
            status: "PENDING",
          };
          await redis.set(`${keyPrefix}${uid}`, JSON.stringify(card));
          created++;
        }
        return res.json({ ok: true, created });
      }
    }

    // ✏️ 編輯卡片
    if (req.method === "PATCH") {
      const { card } = req.body;
      if (!card || !card.uid) return res.status(400).json({ error: "缺少卡片資料" });
      await redis.set(`${keyPrefix}${card.uid}`, JSON.stringify(card));
      return res.json({ ok: true });
    }

    // 🗑 刪除卡片
    if (req.method === "DELETE") {
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: "缺少 UID" });
      await redis.del(`${keyPrefix}${uid}`);
      return res.json({ ok: true });
    }

    res.status(405).json({ error: "Method Not Allowed" });
  } catch (err) {
    console.error("cards.js error:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
}
