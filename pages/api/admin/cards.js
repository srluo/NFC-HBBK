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
      console.log("📝 Redis keys:", keys);

      const cards = [];
      for (const k of keys) {
        try {
          const str = await redis.get(k);

          if (!str) continue;
          if (str === "[object Object]") {
            console.warn(`⚠️ 壞資料 ${k}，自動刪除`);
            await redis.del(k);
            continue;
          }

          const obj = JSON.parse(str);
          if (!obj.uid) obj.uid = k.replace("card:", "");
          cards.push(obj);

        } catch (e) {
          console.warn(`⚠️ parse error: ${k}`, e);
          // 自動刪除 parse 失敗的 key，避免下次再炸
          await redis.del(k);
        }
      }

      return res.json({ ok: true, cards });
    } catch (e) {
      console.error("admin/cards fatal error:", e);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  return res.status(405).end();
}
