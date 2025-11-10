// /pages/api/getCard.js — v2.5.0 Hybrid Safe + TXLOG
import { redis } from "../../lib/redis";

// ------------------------------------------------------------
// 🧩 共用讀寫函式
// ------------------------------------------------------------
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
    console.error("redis.hgetall error", e);
  }

  try {
    const val = await redis.get(key);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error("redis.get error", e);
  }
  return null;
}

// ------------------------------------------------------------
// ⚙️ 防呆：修正 subscriptions
// ------------------------------------------------------------
function sanitizeSubscriptions(raw) {
  if (!raw) return "{}";
  if (typeof raw !== "string") return JSON.stringify(raw);
  const s = raw.trim();
  if (s === "[object Object]") return "{}";
  if (s.startsWith("{") || s.startsWith("[")) return s;
  return "{}";
}

// ------------------------------------------------------------
// 🧭 API 主體
// ------------------------------------------------------------
export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "缺少 token" });

  try {
    // ✅ 解析 UID
    const decoded = Buffer.from(token, "base64").toString();
    const [uid] = decoded.split(":");
    if (!uid) return res.status(400).json({ error: "無效 token" });

    // ✅ 讀取 Redis 資料
    const card = await readCard(uid);
    if (!card) return res.status(404).json({ error: `找不到卡片資料 uid=${uid}` });

    // ✅ 修正 subscriptions 欄位
    const fixedSubs = sanitizeSubscriptions(card.subscriptions);
    if (fixedSubs !== card.subscriptions) {
      await redis.hset(`card:${uid}`, { subscriptions: fixedSubs });
      card.subscriptions = fixedSubs;
    }

    // ✅ 判斷是否首次開卡
    const is_first_open =
      card.status === "ACTIVE" && (!card.opened || card.opened === "false");

    // ✅ 更新 last_seen / opened（不覆蓋整包）
    const nowStr = new Date().toISOString().replace("T", " ").slice(0, 19);
    await redis.hset(`card:${uid}`, {
      last_seen: nowStr,
      opened: "true",
    });

    // ✅ 讀取最近 10 筆 TXLOG
    const logKey = `card:${uid}:txlog`;
    let txlog = [];
    try {
      const raw = await redis.lrange(logKey, 0, 9);
      txlog = raw
        .map((item) => {
          try { return JSON.parse(item); } catch { return null; }
        })
        .filter(Boolean);
    } catch (e) {
      console.warn("⚠️ 無法讀取 TXLOG:", e.message);
    }

    // ✅ 回傳整合資料
    return res.json({
      ok: true,
      card: {
        ...card,
        opened: "true",
        last_seen: nowStr,
        txlog,
      },
      is_first_open,
    });
  } catch (err) {
    console.error("getCard fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}