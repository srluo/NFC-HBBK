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
    try {
      const keys = await redis.keys("card:*");
      const cards = [];
      for (const k of keys) {
        const str = await redis.get(k);
        if (!str) continue;

        try {
          const obj = JSON.parse(str);
          // 保底：確保有 UID 欄位
          if (!obj.uid) obj.uid = k.replace("card:", "");
          cards.push(obj);
        } catch (e) {
          console.warn(`⚠️ parse error: ${k}`, e);
          cards.push({ uid: k.replace("card:", ""), error: "parse error" });
        }
      }

      return res.json({ ok: true, cards });
    } catch (e) {
      console.error("admin/cards GET fatal:", e);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  return res.status(405).end();
}
