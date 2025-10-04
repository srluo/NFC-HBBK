import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

function ensureAuth(req, res) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "未登入" });
    return null;
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch (e) {
    res.status(401).json({ error: "無效 token" });
    return null;
  }
}

export default async function handler(req, res) {
  if (!ensureAuth(req, res)) return;

  const { method } = req;

  // ✅ GET：列出所有卡片（HASH）
  if (method === "GET") {
    try {
      const keys = await redis.keys("card:*");
      const cards = [];
      for (const key of keys) {
        const hash = await redis.hgetall(key);
        if (Object.keys(hash).length > 0) {
          cards.push(hash);
        }
      }
      return res.json({ ok: true, cards });
    } catch (err) {
      console.error("admin/cards GET error:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // ✅ POST：新增單筆 / 批次 CSV
  if (method === "POST") {
    try {
      const { mode, card, csvText } = req.body || {};

      if (mode === "csv") {
        let created = 0;
        const lines = csvText.trim().split("\n").slice(1);
        for (const line of lines) {
          const [uid, birthday, points] = line.split(",").map(x => x.trim());
          if (!uid) continue;
          const key = `card:${uid}`;
          await redis.hset(key, {
            uid,
            birthday: birthday || "",
            points: points || "0",
            status: "PENDING",
          });
          created++;
        }
        return res.json({ ok: true, created });
      }

      if (mode === "single" && card?.uid) {
        const key = `card:${card.uid}`;
        const fields = {};
        for (const [k, v] of Object.entries(card)) {
          fields[k] = String(v ?? "");
        }
        await redis.hset(key, fields);
        return res.json({ ok: true });
      }

      return res.status(400).json({ error: "缺少必要參數" });
    } catch (err) {
      console.error("admin/cards POST error:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // ✅ PATCH：更新單筆
  if (method === "PATCH") {
    try {
      const { card } = req.body || {};
      if (!card?.uid) return res.status(400).json({ error: "缺少 UID" });

      const key = `card:${card.uid}`;
      const fields = {};
      for (const [k, v] of Object.entries(card)) {
        fields[k] = String(v ?? "");
      }
      await redis.hset(key, fields);
      return res.json({ ok: true });
    } catch (err) {
      console.error("admin/cards PATCH error:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // ✅ DELETE：刪除單筆
  if (method === "DELETE") {
    try {
      const { uid } = req.body || {};
      if (!uid) return res.status(400).json({ error: "缺少 UID" });

      const key = `card:${uid}`;
      await redis.del(key);
      return res.json({ ok: true });
    } catch (err) {
      console.error("admin/cards DELETE error:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
