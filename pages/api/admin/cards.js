import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  // 驗證管理員 token
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "未登入" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: "無效 token" });
  }

  // 🟡 1. 取得卡片列表
  if (req.method === "GET") {
    try {
      const keys = await redis.keys("card:*");
      console.log("ALL Redis keys:", keys);
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
          cards.push({ uid: k.replace("card:", ""), error: "parse error" });
        }
      }

      return res.json({ ok: true, cards });
    } catch (err) {
      console.error("List cards fatal:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // 🟡 2. 新增卡片（單筆 or CSV）
  if (req.method === "POST") {
    const { mode, card, csvText } = req.body || {};

    try {
      if (mode === "single" && card) {
        if (!card.uid) return res.status(400).json({ error: "缺少 UID" });
        const key = `card:${card.uid}`;
        const value = JSON.stringify({
          uid: card.uid,
          birthday: card.birthday || "",
          points: Number(card.points) || 0,
          status: card.status || "PENDING",
        });
        await redis.set(key, value);
        return res.json({ ok: true });
      }

      if (mode === "csv" && csvText) {
        const lines = csvText.trim().split("\n").slice(1); // 跳過表頭
        let created = 0;
        for (const line of lines) {
          const [uid, birthday, points] = line.split(",");
          if (!uid) continue;
          const key = `card:${uid}`;
          const value = JSON.stringify({
            uid,
            birthday: birthday || "",
            points: Number(points) || 0,
            status: "PENDING",
          });
          await redis.set(key, value);
          created++;
        }
        return res.json({ ok: true, created });
      }

      return res.status(400).json({ error: "無效的請求" });
    } catch (err) {
      console.error("Create cards fatal:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // 🟡 3. 編輯卡片（PATCH）
  if (req.method === "PATCH") {
    const { card } = req.body || {};
    if (!card || !card.uid) return res.status(400).json({ error: "缺少 UID" });

    try {
      const key = `card:${card.uid}`;
      const value = JSON.stringify(card);
      await redis.set(key, value);
      return res.json({ ok: true });
    } catch (err) {
      console.error("Patch card fatal:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // 🟡 4. 刪除卡片
  if (req.method === "DELETE") {
    const { uid } = req.body || {};
    if (!uid) return res.status(400).json({ error: "缺少 UID" });

    try {
      const key = `card:${uid}`;
      await redis.del(key);
      return res.json({ ok: true });
    } catch (err) {
      console.error("Delete card fatal:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  return res.status(405).end();
}
