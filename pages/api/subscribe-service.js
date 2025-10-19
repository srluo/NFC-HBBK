// /pages/api/subscribe-service.js — v2.3 Stable
import { redis } from "../../lib/redis";
import {
  parseSubscriptions,
  stringifySubscriptions,
  updateSubscription,
} from "../../lib/subscriptions";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, message: "Method not allowed" });

  try {
    const { uid, service, days = 365, cost = 5 } = req.body || {};
    if (!uid || !service)
      return res.status(400).json({ ok: false, message: "缺少必要參數" });

    const key = `card:${uid}`;
    const card = await redis.hgetall(key);
    if (!card || !card.status)
      return res.status(404).json({ ok: false, message: "查無卡片資料" });

    // ------------------------------------------------------------
    // 🧩 解析訂閱資料（透過 lib/subscriptions.js）
    // ------------------------------------------------------------
    let subs = parseSubscriptions(card.subscriptions);

    // ------------------------------------------------------------
    // 💰 扣點（若有設定）
    // ------------------------------------------------------------
    let points = Number(card.points || 0);
    if (points < cost) {
      return res.json({
        ok: false,
        message: `點數不足，需 ${cost} 點`,
      });
    }
    points -= cost;

    // ------------------------------------------------------------
    // 📅 更新 / 新增訂閱
    // ------------------------------------------------------------
    const now = new Date();
    const newUntil = new Date(now);
    newUntil.setDate(now.getDate() + days);

    subs = updateSubscription(subs, service, {
      active: true,
      until: newUntil.toISOString().slice(0, 10),
      last_use: now.toISOString().slice(0, 10),
    });

    // ------------------------------------------------------------
    // 💾 寫回 Redis
    // ------------------------------------------------------------
    await redis.hset(key, {
      subscriptions: stringifySubscriptions(subs),
      points: points.toString(),
      updated_at: Date.now().toString(),
    });

    // ------------------------------------------------------------
    // 🎯 回傳結果
    // ------------------------------------------------------------
    return res.json({
      ok: true,
      uid,
      service,
      active_until: newUntil.toISOString().slice(0, 10),
      points,
      message: `✅ 已成功開通 ${service} 服務，有效至 ${newUntil
        .toISOString()
        .slice(0, 10)}`,
    });
  } catch (err) {
    console.error("subscribe-service fatal:", err);
    return res.status(500).json({ ok: false, message: "伺服器錯誤" });
  }
}