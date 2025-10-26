import { redis } from "../../../lib/redis.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });

  try {
    const { uid } = req.body || {};
    if (!uid)
      return res.status(400).json({ ok: false, error: "缺少 UID" });

    const key = `card:${uid}`;
    const card = await redis.hgetall(key);
    if (!card || !card.pins)
      return res.status(404).json({ ok: false, error: "未設定 PIN" });

    const pins =
      typeof card.pins === "string" ? JSON.parse(card.pins) : card.pins || {};
    pins.enabled = false;
    pins.hash = "";
    pins.updated_at = new Date().toISOString();

    await redis.hset(key, { pins: JSON.stringify(pins) });
    return res.json({ ok: true, message: "🔓 PIN 已停用" });
  } catch (err) {
    console.error("PIN disable error:", err);
    return res.status(500).json({ ok: false, error: "伺服器錯誤" });
  }
}