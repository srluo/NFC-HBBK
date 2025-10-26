// pages/api/pin/verify.js — 修正版
import { redis } from "../../../lib/redis.js";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { uid, pin } = req.body || {};
    if (!uid || !pin)
      return res.status(400).json({ error: "缺少 UID 或 PIN" });

    const key = `card:${uid}`;
    const card = await redis.hgetall(key);
    if (!card || Object.keys(card).length === 0)
      return res.status(404).json({ error: "找不到卡片" });

    // ✅ 避免重複 JSON.parse
    const pins =
      typeof card.pins === "string" ? JSON.parse(card.pins) : card.pins || {};

    if (!pins.enabled || !pins.hash)
      return res.status(400).json({ error: "尚未設定 PIN" });

    const now = Date.now();
    if (pins.locked_until && now < pins.locked_until)
      return res.status(423).json({
        error: `PIN 已鎖定，請稍後再試`,
      });

    const pass = await bcrypt.compare(pin, pins.hash);
    if (!pass) {
      pins.attempts = (pins.attempts || 0) + 1;
      if (pins.attempts >= (pins.max_attempts || 5)) {
        pins.locked_until = now + (pins.lock_minutes || 10) * 60 * 1000;
        pins.attempts = 0;
      }
      await redis.hset(key, { pins: JSON.stringify(pins) });
      return res.status(401).json({ error: "PIN 錯誤或已鎖定" });
    }

    // 通過驗證
    pins.attempts = 0;
    pins.locked_until = 0;
    pins.last_auth = now;
    await redis.hset(key, { pins: JSON.stringify(pins) });

    return res.json({ ok: true });
  } catch (err) {
    console.error("PIN verify error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}