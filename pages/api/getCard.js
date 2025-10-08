import { redis } from "../../lib/redis";

const TOKEN_TTL_MS = 1000 * 1000; // 約 16 分鐘

async function readCard(uid) {
  const key = `card:${uid}`;
  const hash = await redis.hgetall(key);
  if (hash && Object.keys(hash).length > 0) {
    if (hash.points) hash.points = Number(hash.points);
    if (hash.updated_at) hash.updated_at = Number(hash.updated_at);
    return hash;
  }
  return null;
}

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "缺少 token" });

  try {
    const decoded = Buffer.from(token, "base64").toString();
    const [uid, birthday, issuedAt, ts] = decoded.split(":");
    if (!uid || !issuedAt) {
      return res.status(400).json({ error: "無效 token 結構" });
    }

    // ✅ Token 時效驗證
    const age = Date.now() - Number(issuedAt);
    if (age > TOKEN_TTL_MS) {
      return res.status(403).json({ error: "Token 已過期 (timeout)" });
    }

    const card = await readCard(uid);
    if (!card) {
      return res.status(404).json({ error: `找不到卡片 uid=${uid}` });
    }

    // ✅ 判斷是否首次開啟
    let is_first_open = false;
    if (card.status === "ACTIVE" && (!card.opened || card.opened === "false")) {
      is_first_open = true;
    }

    // ✅ 標記為已開啟
    card.opened = true;
    await redis.hset(`card:${uid}`, card);

    return res.json({ ok: true, card, is_first_open });
  } catch (err) {
    console.error("getCard fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}