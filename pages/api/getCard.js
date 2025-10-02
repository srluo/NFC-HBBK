import { redis } from "@/lib/redis";

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "缺少 token" });

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [uid] = decoded.split(":");

    const cardKey = `card:${uid}`;
    const card = await redis.hgetall(cardKey);
    if (!card || !card.status) {
      return res.status(404).json({ error: "卡片未開通" });
    }

    let isFirstOpen = false;
    if (!card.first_opened_at) {
      isFirstOpen = true;
      await redis.hset(cardKey, { first_opened_at: Date.now() });
    }

    return res.json({ card, is_first_open: isFirstOpen });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "系統錯誤" });
  }
}
