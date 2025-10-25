// /pages/api/admin/cards.js — NFC BirthdayBook v2.6 Admin API
import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

/** 驗證管理者 Token */
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
    console.error("Invalid token:", e);
    res.status(401).json({ error: "無效 token" });
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (!ensureAuth(req, res)) return;

  const { method } = req;

  // 🟢 GET：列出全部卡片或單筆查詢
  if (method === "GET") {
    try {
      const { uid } = req.query;

      // 查單筆
      if (uid) {
        const data = await redis.hgetall(`card:${uid}`);
        if (!data || Object.keys(data).length === 0)
          return res.status(404).json({ error: "找不到該卡" });
        return res.json({ ok: true, data });
      }

      // 查全部（限制 200 筆以防太大）
      const keys = await redis.keys("card:*");
      const list = [];
      for (const key of keys.slice(0, 200)) {
        const hash = await redis.hgetall(key);
        if (Object.keys(hash).length > 0) list.push(hash);
      }
      return res.json({ ok: true, count: list.length, data: list });
    } catch (err) {
      console.error("admin/cards GET error:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // 🟢 POST：新增單筆或批次 CSV 匯入
  if (method === "POST") {
    try {
      const { mode, card, csvText } = req.body || {};

      // 批次匯入模式
      if (mode === "csv") {
        let created = 0;
        const lines = csvText.trim().split("\n").slice(1); // 跳過標題
        const now = new Date().toISOString();

        for (const line of lines) {
          const [uid, birthday, points] = line.split(",").map(x => x.trim());
          if (!uid) continue;

          await redis.hset(`card:${uid}`, {
            uid,
            birthday: birthday || "",
            points: points || "0",
            status: "PENDING",
            created_at: now,
            tp: "HB",
            last_ts: "0",
          });
          created++;
        }
        return res.json({ ok: true, created });
      }

      // 新增單筆
      if (mode === "single" && card?.uid) {
        const key = `card:${card.uid}`;
        const fields = Object.fromEntries(
          Object.entries(card).map(([k, v]) => [k, String(v ?? "")])
        );
        await redis.hset(key, fields);
        return res.json({ ok: true });
      }

      return res.status(400).json({ error: "缺少必要參數" });
    } catch (err) {
      console.error("admin/cards POST error:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

// 🟢 PATCH：更新卡片欄位
if (method === "PATCH") {
  try {
    const { card } = req.body || {};
    if (!card?.uid) return res.status(400).json({ error: "缺少 UID" });

    const key = `card:${card.uid}`;

    // 🔧 保護 JSON 欄位，轉回字串
    const jsonFields = ["four_pillars", "ziweis", "subscriptions"];
    const fields = Object.fromEntries(
      Object.entries(card).map(([k, v]) => {
        if (jsonFields.includes(k) && typeof v === "object")
          return [k, JSON.stringify(v)];
        return [k, String(v ?? "")];
      })
    );

    await redis.hset(key, fields);
    return res.json({ ok: true });
  } catch (err) {
    console.error("admin/cards PATCH error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}

  // 🟢 DELETE：刪除卡片
  if (method === "DELETE") {
    try {
      const { uid } = req.body || {};
      if (!uid) return res.status(400).json({ error: "缺少 UID" });

      await redis.del(`card:${uid}`);
      return res.json({ ok: true, deleted: uid });
    } catch (err) {
      console.error("admin/cards DELETE error:", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}