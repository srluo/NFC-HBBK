import { redis } from "../../lib/redis";

const TOKEN_TTL_MS = 1000 * 1000; // 約 16 分鐘有效

async function readCard(uid) {
  const key = `card:${uid}`;
  try {
    const hash = await redis.hgetall(key);
    if (hash && Object.keys(hash).length > 0) {
      if (hash.points) hash.points = Number(hash.points);
      if (hash.updated_at) hash.updated_at = Number(hash.updated_at);
      return hash;
    }
  } catch (e) {
    console.error("❌ redis.hgetall error:", e);
  }
  return null;
}

async function writeCard(uid, card) {
  const key = `card:${uid}`;
  try {
    const flat = {};
    for (const [k, v] of Object.entries(card)) {
      flat[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
    }
    await redis.hset(key, flat);
  } catch (e) {
    console.error("❌ redis.hset error:", e);
  }
}

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ ok: false, error: "缺少 token" });
  }

  try {
    // ✅ 解碼 token
    const decoded = Buffer.from(token, "base64").toString();
    const parts = decoded.split(":");

    if (parts.length < 4) {
      return res.status(400).json({ ok: false, error: "Token 結構錯誤" });
    }

    const [uid, birthday, issuedAtRaw, ts] = parts;

    if (!uid || !issuedAtRaw) {
      return res.status(400).json({ ok: false, error: "無效 token (缺少欄位)" });
    }

    // ✅ Token 時效檢查（加上 NaN 防呆）
    const issuedAt = parseInt(issuedAtRaw, 10);
    if (isNaN(issuedAt)) {
      console.warn("⚠️ issuedAt 無法解析:", issuedAtRaw);
    } else {
      const age = Date.now() - issuedAt;
      if (age > TOKEN_TTL_MS) {
        console.warn(`⚠️ Token 已過期 (${Math.floor(age / 1000)} 秒)`);
        return res.status(403).json({ ok: false, error: "Token 已過期 (timeout)" });
      }
    }

    // ✅ 查詢卡片
    const card = await readCard(uid);
    if (!card) {
      return res.status(404).json({ ok: false, error: `找不到卡片 uid=${uid}` });
    }

    // ✅ 判斷首次開啟
    let is_first_open = false;
    if (card.status === "ACTIVE" && (!card.opened || card.opened === "false")) {
      is_first_open = true;
    }

    // ✅ 標記卡片為「已開啟」
    card.opened = true;
    await writeCard(uid, card);

    // ✅ 回傳統一格式
    return res.json({ ok: true, card, is_first_open });
  } catch (err) {
    console.error("🔥 getCard fatal error:", err);
    return res.status(500).json({ ok: false, error: "伺服器錯誤" });
  }
}
