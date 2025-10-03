import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

function verifyAdminToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch (e) {
    return false;
  }
}

async function listCards() {
  const cards = [];
  let cursor = "0";

  do {
    // ⚠️ Upstash 免費版 MATCH 不可靠 → 改用全域 scan 再自行 filter
    const [nextCursor, keys] = await redis.scan(cursor, { count: 100 });
    cursor = nextCursor;

    const cardKeys = keys.filter((k) => k.startsWith("card:"));
    if (cardKeys.length === 0) continue;

    const values = await Promise.all(cardKeys.map((key) => redis.get(key)));
    for (const val of values) {
      if (!val) continue;
      try {
        cards.push(JSON.parse(val));
      } catch (e) {
        console.error("JSON parse error on", val, e);
      }
    }
  } while (cursor !== "0");

  return cards;
}

export default async function handler(req, res) {
  // ✅ 驗證管理員 Token
  if (!verifyAdminToken(req)) {
    return res.status(401).json({ error: "未授權" });
  }

  try {
    if (req.method === "GET") {
      // ✅ 讀取所有卡片資料
      const cards = await listCards();
      return res.json({ ok: true, cards });
    }

    if (req.method === "POST") {
      const { mode, csvText, card } = req.body;

      if (mode === "csv") {
        // ✅ 批次匯入 CSV
        const lines = csvText.trim().split("\n").slice(1);
        let created = 0;
        for (const line of lines) {
          const [uid, birthday, points] = line.split(",");
          if (!uid || !birthday) continue;
          const data = {
            uid,
            birthday,
            points: Number(points) || 0,
            status: "PENDING",
          };
          await redis.set(`card:${uid}`, JSON.stringify(data));
          created++;
        }
        return res.json({ ok: true, created });
      }

      if (mode === "single") {
        // ✅ 新增單一卡片
        if (!card.uid) return res.status(400).json({ error: "缺少 UID" });
        await redis.set(`card:${card.uid}`, JSON.stringify(card));
        return res.json({ ok: true });
      }
    }

    if (req.method === "PATCH") {
      // ✅ 更新卡片
      const { card } = req.body;
      if (!card || !card.uid) return res.status(400).json({ error: "缺少 UID" });
      await redis.set(`card:${card.uid}`, JSON.stringify(card));
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      // ✅ 刪除卡片
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: "缺少 UID" });
      await redis.del(`card:${uid}`);
      return res.json({ ok: true });
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    res.status(405).end();
  } catch (err) {
    console.error("admin/cards fatal:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
