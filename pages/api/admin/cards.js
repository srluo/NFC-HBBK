// /pages/api/admin/cards.js
import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const { method } = req;

  // ✅ 管理端驗證
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "未授權" });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Token 無效" });
  }

  // 📌 讀取全部卡片資料（列表）
  if (method === "GET") {
    try {
      const keys = await redis.keys("card:*");
      const cards = await Promise.all(
        keys.map(async (key) => {
          let data = null;

          // 先嘗試 JSON
          const str = await redis.get(key);
          if (str) {
            try {
              data = JSON.parse(str);
            } catch (e) {
              console.error(`JSON parse error on ${key}`, e);
            }
          }

          // 若 JSON 沒有，就試 Hash
          if (!data) {
            const hash = await redis.hgetall(key);
            if (hash && Object.keys(hash).length > 0) {
              data = hash;
            }
          }

          // 組合預設值，避免 undefined 導致前端表格出錯
          const uid = data?.uid || key.replace("card:", "");
          return {
            uid,
            user_name: data?.user_name || "-",
            birthday: data?.birthday || "-",
            status: data?.status || "-",
            points: Number(data?.points || 0),
            last_seen: data?.last_seen || "-",
          };
        })
      );

      return res.json({ cards });
    } catch (err) {
      console.error("admin/cards GET error", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  // 📌 批次匯入 CSV
  if (method === "POST") {
    try {
      const { csv } = req.body;
      if (!csv) return res.status(400).json({ error: "缺少 CSV 內容" });

      const lines = csv.trim().split("\n");
      const header = lines.shift().split(",");
      const uidIdx = header.indexOf("uid");
      const birthdayIdx = header.indexOf("birthday");
      const pointsIdx = header.indexOf("points");

      if (uidIdx === -1) return res.status(400).json({ error: "CSV 缺少 uid 欄位" });

      for (const line of lines) {
        const cols = line.split(",");
        const uid = cols[uidIdx];
        const birthday = birthdayIdx !== -1 ? cols[birthdayIdx] : "";
        const points = pointsIdx !== -1 ? Number(cols[pointsIdx]) : 0;

        const card = {
          uid,
          birthday,
          points,
          status: "PENDING",
          created_at: Date.now(),
        };

        await redis.set(`card:${uid}`, JSON.stringify(card));
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error("admin/cards POST error", err);
      return res.status(500).json({ error: "伺服器錯誤" });
    }
  }

  return res.status(405).end();
}
