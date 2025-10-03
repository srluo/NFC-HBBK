import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ 驗證管理員 Token
function verifyAdmin(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const token = auth.replace("Bearer ", "");
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// ✅ 列出所有卡片（使用 SCAN）
async function listCards() {
  const cards = [];
  let cursor = "0";
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: "card:*", count: 100 });
    cursor = nextCursor;
    for (const key of keys) {
      const val = await redis.get(key);
      if (!val) continue;
      try {
        cards.push(JSON.parse(val));
      } catch (e) {
        console.error("JSON parse error:", key, e);
      }
    }
  } while (cursor !== "0");
  return cards;
}

// ✅ 新增或更新一張卡片
async function upsertCard(card) {
  const key = `card:${card.uid}`;
  const existingVal = await redis.get(key);
  let existing = {};
  if (existingVal) {
    try { existing = JSON.parse(existingVal); } catch {}
  }

  const newCard = {
    ...existing,
    uid: card.uid,
    birthday: card.birthday || existing.birthday || "",
    points: card.points ?? existing.points ?? 0,
    status: card.status || existing.status || "PENDING",
    user_name: card.user_name || existing.user_name || "",
    last_seen: existing.last_seen || "",
    updated_at: Date.now(),
  };

  await redis.set(key, JSON.stringify(newCard));
  return newCard;
}

// ✅ PATCH 更新卡片
async function patchCard(card) {
  const key = `card:${card.uid}`;
  const existingVal = await redis.get(key);
  if (!existingVal) throw new Error(`卡片不存在：${card.uid}`);
  let existing = {};
  try { existing = JSON.parse(existingVal); } catch {}

  const updated = {
    ...existing,
    ...card,
    updated_at: Date.now(),
  };

  await redis.set(key, JSON.stringify(updated));
  return updated;
}

// ✅ 刪除卡片
async function deleteCard(uid) {
  const key = `card:${uid}`;
  await redis.del(key);
}

// ✅ CSV 匯入
async function importCSV(csvText) {
  const lines = csvText.trim().split("\n").filter(l => l.trim() !== "");
  if (lines.length < 2) return 0;
  let count = 0;
  for (let i = 1; i < lines.length; i++) {
    const [uid, birthday, pointsStr] = lines[i].split(",");
    if (!uid) continue;
    await upsertCard({ uid: uid.trim(), birthday: birthday?.trim(), points: Number(pointsStr || 0) });
    count++;
  }
  return count;
}

// ✅ 主 handler
export default async function handler(req, res) {
  const admin = verifyAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: "未授權" });
  }

  try {
    if (req.method === "GET") {
      const cards = await listCards();
      return res.json({ ok: true, cards });
    }

    if (req.method === "POST") {
      const { mode, card, csvText } = req.body;
      if (mode === "single") {
        const newCard = await upsertCard(card);
        return res.json({ ok: true, card: newCard });
      } else if (mode === "csv") {
        const created = await importCSV(csvText);
        return res.json({ ok: true, created });
      }
    }

    if (req.method === "PATCH") {
      const { card } = req.body;
      const updated = await patchCard(card);
      return res.json({ ok: true, card: updated });
    }

    if (req.method === "DELETE") {
      const { uid } = req.body;
      await deleteCard(uid);
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "不支援的請求方法" });
  } catch (err) {
    console.error("admin/cards fatal:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
