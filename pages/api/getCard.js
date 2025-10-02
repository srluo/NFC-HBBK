import { redis } from "../../lib/redis";

async function readCard(uid) {
  const key = `card:${uid}`;
  try {
    const str = await redis.get(key);
    if (typeof str === "string") {
      try { return JSON.parse(str); } catch {}
    }
  } catch (e) {}
  try {
    const hash = await redis.hgetall(key);
    if (hash && Object.keys(hash).length > 0) return hash;
  } catch (e) {}
  return null;
}

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "缺少 token" });

  try {
    const [uid] = Buffer.from(token, "base64").toString().split(":");

    let card = await readCard(uid);
    if (!card) return res.status(404).json({ error: "找不到卡片資料" });

    return res.json({ card, is_first_open: false });
  } catch (err) {
    console.error("getCard fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
