import jwt from "jsonwebtoken";
import { redis } from "../../../lib/redis";

function auth(req) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// ✅ 統一用 JSON 格式存取卡片資料
async function readCard(uid) {
  const key = `card:${uid}`;
  const val = await redis.get(key);
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch (e) {
    console.error("JSON parse error", key, e);
    return null;
  }
}

async function writeCard(uid, data) {
  const key = `card:${uid}`;
  await redis.set(key, JSON.stringify(data));
}

async function listCards() {
  const keys = await redis.keys("card:*");
  const cards = [];
  for (const key of keys) {
    const val = await redis.get(key);
    if (!val) continue;
    try {
      const card = JSON.parse(val);
      cards.push(card);
    } catch (e) {
      console.error("JSON parse error", key, e);
    }
  }
  return cards;
}

export default async function handler(req, res) {
  const user = auth(req);
  if (!user) return res.status(401).json({ error: "未授權" });

  try {
    if (req.method === "GET") {
      const cards = await listCards();
      return res.json({ ok: true, cards });
    }

    if (req.method === "POST") {
      const { mode, csvText, card } = req.body;

      // ✅ 批次匯入 CSV
      if (mode === "csv" && csvText) {
        const lines = csvText.trim().split("\n").slice(1);
        let created = 0;
        for (const line of lines) {
          const [uid, birthday, points] = line.split(",");
          if (!uid) continue;
          const data = {
            uid,
            birthday,
            points: Number(points) || 0,
            status: "PENDING",
            last_seen: null,
          };
          await writeCard(uid, data);
          created++;
        }
        return res.json({ ok: true, created });
      }

      // ✅ 單筆新增
      if (mode === "single" && card) {
        await writeCard(card.uid, card);
        return res.json({ ok: true });
      }

      return res.status(400).json({ error: "無效的請求" });
    }

    if (req.method === "PATCH") {
      const { card } = req.body;
      if (!card || !card.uid) return res.status(400).json({ error: "缺少卡片資料" });

      const existing = (await readCard(card.uid)) || {};
      const updated = { ...existing, ...card };
      await writeCard(card.uid, updated);
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: "缺少 UID" });
      await redis.del(`card:${uid}`);
      return res.json({ ok: true });
    }

    res.status(405).end();
  } catch (err) {
    console.error("admin/cards fatal:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
}
