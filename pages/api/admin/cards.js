import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "未登入" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: "無效 token" });
  }

  if (req.method === "GET") {
    // 列出所有卡片
    const keys = await redis.keys("card:*");
    const cards = [];
    for (const k of keys) {
      const str = await redis.get(k);
      try {
        cards.push(JSON.parse(str));
      } catch {
        cards.push({ uid: k.replace("card:", ""), error: "parse error" });
      }
    }
    return res.json({ ok: true, cards });
  }

  return res.status(405).end();
}
