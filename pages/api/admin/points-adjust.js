// /api/admin/points-adjust.js — v1.3 商化正式版
import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

const TZ = "Asia/Taipei";

function getAdmin(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload?.email || payload?.user || "admin";
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  const admin = getAdmin(req);
  if (!admin) return res.status(401).json({ error: "未登入或 token 無效" });

  try {
    const { uid, delta, reason } = req.body || {};
    if (!uid || typeof delta !== "number")
      return res.status(400).json({ error: "缺少參數 uid 或 delta" });

    const cardKey = `card:${uid}`;
    const card = await redis.hgetall(cardKey);
    if (!card || Object.keys(card).length === 0)
      return res.status(404).json({ error: "找不到卡片資料" });

    const before = Number(card.points || 0);
    let adj = delta;
    let after = before + adj;

    // 🧩 防止負值
    if (after < 0) {
      adj = -before;
      after = 0;
    }

    const txKey = `card:${uid}:txlog`;
    const record = {
      type: "admin",
      service: delta >= 0 ? "管理員加值" : "管理員扣點",
      delta: adj,
      reason: reason || "",
      points_before: before,
      points_after: after,
      admin,
      date: new Date().toLocaleString("zh-TW", { timeZone: TZ }),
    };

    await redis
      .multi()
      .hincrby(cardKey, "points", adj)
      .lpush(txKey, JSON.stringify(record))
      .ltrim(txKey, 0, 9)
      .exec();

    res.json({
      ok: true,
      uid,
      points_before: before,
      points_after: after,
      applied_delta: adj,
      record,
    });
  } catch (err) {
    console.error("[admin/points-adjust] Error:", err);
    res.status(500).json({ error: "伺服器錯誤：" + err.message });
  }
}