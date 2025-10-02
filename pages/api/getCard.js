import { redis } from "../../lib/redis";

async function readCard(uid) {
  const key = `card:${uid}`;
  try {
    const str = await redis.get(key);
    if (typeof str === "string") {
      try { return JSON.parse(str); } catch (e) { console.error("JSON parse error", e); }
    }
  } catch (e) {
    console.error("redis.get error", e);
  }
  try {
    const hash = await redis.hgetall(key);
    if (hash && Object.keys(hash).length > 0) return hash;
  } catch (e) {
    console.error("redis.hgetall error", e);
  }
  return null;
}

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "缺少 token" });

  try {
    // 解碼 token → 取出 uid
    const decoded = Buffer.from(token, "base64").toString();
    const [uid] = decoded.split(":");

    if (!uid) {
      return res.status(400).json({ error: "無效 token" });
    }

    let card = await readCard(uid);
    if (!card) {
      return res.status(404).json({ error: `找不到卡片資料 uid=${uid}` });
    }

    // 判斷是否首次開啟
    const is_first_open = !card.opened;
    card.opened = true; // 標記已經開過

    // 更新回 Redis
    await redis.set(`card:${uid}`, JSON.stringify(card));

    return res.json({ card, is_first_open });
  } catch (err) {
    console.error("getCard fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
