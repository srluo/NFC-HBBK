import { redis } from "../../lib/redis";

async function readCard(uid) {
  const key = `card:${uid}`;
  try {
    const hash = await redis.hgetall(key);
    if (hash && Object.keys(hash).length > 0) {
      if (hash.points) hash.points = Number(hash.points);
      if (hash.updated_at) hash.updated_at = Number(hash.updated_at);
      return hash;
    }
  } catch (e) {
    console.error("redis.hgetall error", e);
  }

  try {
    const val = await redis.get(key);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error("redis.get error", e);
  }
  return null;
}

async function writeCard(uid, card) {
  const key = `card:${uid}`;
  const flatCard = {};
  for (const [k, v] of Object.entries(card)) {
    flatCard[k] = String(v ?? "");
  }
  await redis.hset(key, flatCard);
}

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "缺少 token" });

  try {
    const decoded = Buffer.from(token, "base64").toString();
    const [uid] = decoded.split(":");
    if (!uid) return res.status(400).json({ error: "無效 token" });

    let card = await readCard(uid);
    if (!card) return res.status(404).json({ error: `找不到卡片資料 uid=${uid}` });

    let is_first_open = false;
    if (card.status === "ACTIVE" && (!card.opened || card.opened === "false")) {
      is_first_open = true;
    }

    card.opened = "true";
    await writeCard(uid, card);

    return res.json({ card, is_first_open });
  } catch (err) {
    console.error("getCard fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}