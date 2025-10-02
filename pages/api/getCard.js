import { redis } from "../../lib/redis";

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "缺少 token" });

  const [uid] = Buffer.from(token, "base64").toString().split(":");

  let card = await redis.get(`card:${uid}`);
  card = card ? JSON.parse(card) : null;

  if (!card) {
    return res.status(404).json({ error: "找不到卡片資料" });
  }

  return res.json({
    card,
    is_first_open: card.first_opened ? false : true
  });
}