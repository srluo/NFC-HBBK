// /pages/api/admin/pin-control.js — v1.0
import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 10;

function ensureAuth(req, res) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ ok: false, error: "未登入" });
    return null;
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    res.status(401).json({ ok: false, error: "無效 token" });
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  if (!ensureAuth(req, res)) return;

  try {
    const { uid, action, newPin } = req.body || {};
    if (!uid || !action)
      return res.status(400).json({ ok: false, error: "缺少必要參數" });

    const key = `card:${uid}`;
    const card = await redis.hgetall(key);
    if (!card || Object.keys(card).length === 0)
      return res.status(404).json({ ok: false, error: "找不到卡片" });

    // pins 解析（可能是字串或物件）
    const pins =
      typeof card.pins === "string" ? JSON.parse(card.pins) :
      (card.pins || {});

    const now = Date.now();

    if (action === "disable") {
      pins.enabled = false;
      pins.hash = "";
      pins.attempts = 0;
      pins.locked_until = 0;
      pins.updated_at = new Date().toISOString();
      await redis.hset(key, { pins: JSON.stringify(pins) });
      return res.json({ ok: true, message: "🔓 已停用 PIN 鎖" });
    }

    if (action === "unlock") {
      pins.attempts = 0;
      pins.locked_until = 0;
      pins.updated_at = new Date().toISOString();
      await redis.hset(key, { pins: JSON.stringify(pins) });
      return res.json({ ok: true, message: "✅ 已解除暫時鎖定" });
    }

    if (action === "enable" || action === "reset") {
      if (!/^\d{4,6}$/.test(String(newPin || "")))
        return res.status(400).json({ ok: false, error: "新 PIN 必須為 4–6 位數字" });

      const hash = await bcrypt.hash(String(newPin), 10);
      pins.enabled = true;
      pins.hash = hash;
      pins.attempts = 0;
      pins.locked_until = 0;
      pins.max_attempts = pins.max_attempts || MAX_ATTEMPTS;
      pins.lock_minutes = pins.lock_minutes || LOCK_MINUTES;
      pins.updated_at = new Date().toISOString();
      await redis.hset(key, { pins: JSON.stringify(pins) });
      return res.json({ ok: true, message: action === "enable" ? "✅ 已啟用 PIN 鎖" : "✅ 已重設 PIN" });
    }

    return res.status(400).json({ ok: false, error: "不支援的 action" });
  } catch (err) {
    console.error("admin/pin-control error:", err);
    return res.status(500).json({ ok: false, error: "伺服器錯誤" });
  }
}