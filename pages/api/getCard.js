import { redis } from "../../lib/redis";

// 🧩 讀卡（Hash 為主，JSON 為輔）
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

  // fallback 舊資料格式
  try {
    const val = await redis.get(key);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error("❌ redis.get/parse error:", e);
  }

  return null;
}

// 🧩 寫卡（確保欄位為字串）
async function writeCard(uid, card) {
  const key = `card:${uid}`;
  try {
    const flatCard = {};
    for (const [k, v] of Object.entries(card)) {
      flatCard[k] = typeof v === "object" ? JSON.stringify(v) : String(v);
    }
    await redis.hset(key, flatCard);
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
    // 1️⃣ 解碼 token
    const decoded = Buffer.from(token, "base64").toString();
    const [uid] = decoded.split(":");

    if (!uid || uid.length < 10) {
      return res.status(400).json({ ok: false, error: "無效 token" });
    }

    // 2️⃣ 查 Redis
    const card = await readCard(uid);
    if (!card || Object.keys(card).length === 0) {
      return res.status(404).json({
        ok: false,
        error: `找不到卡片資料 uid=${uid}`,
      });
    }

    // 3️⃣ 驗證合法性（防偽）
    if (card.status !== "ACTIVE") {
      return res.status(403).json({
        ok: false,
        error: `卡片狀態異常 (${card.status})，請重新開卡`,
      });
    }

    // 4️⃣ 判斷是否首次開啟
    let is_first_open = false;
    if (!card.opened || card.opened === "false") {
      is_first_open = true;
    }

    // 5️⃣ 更新 opened 狀態
    card.opened = "true";
    await writeCard(uid, card);

    // ✅ 回傳卡片資料
    return res.json({
      ok: true,
      is_first_open,
      card,
    });
  } catch (err) {
    console.error("[getCard] fatal:", err);
    return res.status(500).json({ ok: false, error: "伺服器錯誤" });
  }
}