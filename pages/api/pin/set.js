// /pages/api/pin/set.js — v1.3-Enhanced
import { redis } from "../../../lib/redis.js";
import bcrypt from "bcryptjs";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 10;

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });

  try {
    const { uid, pin } = req.body || {};
    if (!uid || !pin)
      return res.status(400).json({ ok: false, error: "缺少必要參數" });
    if (!/^\d{4,6}$/.test(pin))
      return res.status(400).json({ ok: false, error: "PIN 必須為 4–6 位數字" });

    const key = `card:${uid}`;
    const existing = await redis.hgetall(key);
    if (!existing || Object.keys(existing).length === 0)
      return res.status(404).json({ ok: false, error: "找不到該卡" });

    const hash = await bcrypt.hash(pin, 10);
    const pins = {
      enabled: true,
      hash,
      attempts: 0,
      locked_until: 0,
      max_attempts: MAX_ATTEMPTS,
      lock_minutes: LOCK_MINUTES,
      updated_at: new Date().toISOString(),
    };

    await redis.hset(key, { pins: JSON.stringify(pins) });
    return res.json({ ok: true, message: "✅ PIN 已設定" });
  } catch (err) {
    console.error("PIN set error:", err);
    return res.status(500).json({ ok: false, error: "伺服器錯誤" });
  }
}