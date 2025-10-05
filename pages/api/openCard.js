import { redis } from "../../lib/redis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { uid } = await req.json?.() || req.body;
    if (!uid) return res.status(400).json({ error: "缺少 uid" });

    const key = `card:${uid}`;

    // 檢查是否存在
    const exists = await redis.hgetall(key);
    if (!exists || Object.keys(exists).length === 0) {
      return res.status(404).json({ error: "卡片不存在" });
    }

    // 設定 opened = true
    await redis.hset(key, { ...exists, opened: "true" });

    return res.json({ ok: true });
  } catch (err) {
    console.error("openCard fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}