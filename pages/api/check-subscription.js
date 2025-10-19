// /pages/api/check-subscription.js
// -----------------------------------------------------
// 🧭 多服務通用版 - 訂閱檢查與使用更新 v2.0
// 作者：Roger Luo｜NFCTOGO 研究出版（2025.10）
// -----------------------------------------------------

import { redis } from "../../lib/redis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { uid, service } = req.body || {};
    if (!uid || !service)
      return res.status(400).json({ ok: false, message: "缺少必要參數（uid 或 service）" });

    const key = `card:${uid}`;
    const card = await redis.hgetall(key);

    if (!card || !card.status)
      return res.status(404).json({ ok: false, message: "查無卡片資料" });

    // 🧩 subscriptions 欄位解析
    let subscriptions = {};
    try {
      const raw = card.subscriptions;

      if (!raw) {
        subscriptions = {};
      } else if (typeof raw === "string") {
        subscriptions = JSON.parse(raw.trim());
      } else if (typeof raw === "object") {
        // 🧩 Upstash SDK 可能直接回傳物件
        subscriptions = raw;
      } else {
        subscriptions = {};
      }

    } catch (err) {
      console.warn("⚠️ subscriptions 解析錯誤：", card.subscriptions);
      subscriptions = {};
    }

    const target = subscriptions[service] || {};
    const today = new Date().toISOString().slice(0, 10);
    const until = target.until || "1970-01-01";
    const active = target.active === true || target.active === "true";
    const expired = new Date(until) < new Date();

    // 🧾 回傳邏輯
    if (!active)
      return res.json({ ok: false, service, subscribed: false, message: `尚未開通 ${service} 服務` });

    if (expired)
      return res.json({ ok: false, service, subscribed: false, message: `${service} 服務已到期` });

    // 🕒 更新使用記錄
    if (target.last_use !== today) {
      target.last_use = today;
      subscriptions[service] = target;
      await redis.hset(key, { subscriptions: JSON.stringify(subscriptions) });
    }

    return res.json({
      ok: true,
      service,
      subscribed: true,
      active_until: until,
      last_use: today,
      message: `${service} 服務有效，可使用`,
    });

  } catch (err) {
    console.error("check-subscription error:", err);
    return res.status(500).json({ ok: false, message: "伺服器錯誤" });
  }
}