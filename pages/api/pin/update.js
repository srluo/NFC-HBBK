// /pages/api/pin/update.js — NFC BirthdayBook v1.2
// ✅ 防止 pins 被重複 JSON.parse
// ✅ 驗證原 PIN 正確後更新新 PIN

import { redis } from "../../../lib/redis.js";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { uid, oldPin, newPin } = req.body || {};
    if (!uid || !oldPin || !newPin)
      return res.status(400).json({ error: "缺少必要參數" });

    const key = `card:${uid}`;
    const card = await redis.hgetall(key);
    if (!card || Object.keys(card).length === 0)
      return res.status(404).json({ error: "找不到卡片" });
    if (!card.pins)
      return res.status(400).json({ error: "尚未設定 PIN" });

    // ✅ 避免重複解析
    const pins =
      typeof card.pins === "string" ? JSON.parse(card.pins) : card.pins || {};

    const ok = await bcrypt.compare(oldPin, pins.hash || "");
    if (!ok) return res.status(401).json({ error: "原 PIN 錯誤" });

    if (!/^\d{4,6}$/.test(newPin))
      return res.status(400).json({ error: "新 PIN 必須為 4–6 位數字" });

    const hash = await bcrypt.hash(newPin, 10);
    pins.hash = hash;
    pins.updated_at = new Date().toISOString();
    await redis.hset(key, { pins: JSON.stringify(pins) });

    return res.json({ ok: true, message: "✅ PIN 已更新" });
  } catch (err) {
    console.error("PIN update error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}