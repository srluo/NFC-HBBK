import { redis } from "../../lib/redis";

export default async function handler(req, res) {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).json({ error: "缺少 uid" });
    }

    const key = `card:${uid}`;
    let raw = null;
    try {
      raw = await redis.get(key);
    } catch (e) {
      console.error("redis.get error", e);
    }

    if (raw) {
      try {
        return res.json({ uid, parsed: JSON.parse(raw), raw });
      } catch (e) {
        return res.json({ uid, raw, parse_error: "JSON parse error" });
      }
    }

    // 再試 Hash
    try {
      const hash = await redis.hgetall(key);
      if (hash && Object.keys(hash).length > 0) {
        return res.json({ uid, parsed: hash });
      }
    } catch (e) {
      console.error("redis.hgetall error", e);
    }

    return res.status(404).json({ error: `找不到卡片 uid=${uid}` });
  } catch (err) {
    console.error("debugCard fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}