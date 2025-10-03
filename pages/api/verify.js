import { redis } from "../../lib/redis";
import { sign } from "../../lib/sign";

function safeNowString() {
  const now = new Date();
  try {
    const fmt = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return fmt.format(now);
  } catch (e) {
    const t = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return t.toISOString().replace("T", " ").slice(0, 19);
  }
}

async function readCard(uid) {
  const key = `card:${uid}`;
  try {
    const val = await redis.get(key);
    if (!val) return null;

    // ✅ JSON 字串
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch (e) {
        console.error("JSON parse error", e);
        // 如果不能 parse，就直接包在 raw 回傳
        return { raw: val };
      }
    }

    // ✅ 直接是物件（某些版本誤寫）
    if (typeof val === "object") {
      return val;
    }
  } catch (e) {
    console.error("redis.get error", e);
  }

  // ✅ fallback: Redis Hash
  try {
    const hash = await redis.hgetall(key);
    if (hash && Object.keys(hash).length > 0) return hash;
  } catch (e) {
    console.error("redis.hgetall error", e);
  }

  return null;
}

async function writeCard(uid, card) {
  const key = `card:${uid}`;
  await redis.set(key, JSON.stringify(card));
}

export default async function handler(req, res) {
  try {
    const { d, uuid } = req.query;
    if (!d || !uuid) return res.status(400).json({ error: "缺少參數" });

    const uid = uuid.slice(0, 14);
    const tp = uuid.slice(14, 16);
    const ts = uuid.slice(16, 24);
    const rlc = uuid.slice(24);

    if (tp !== "HB") return res.status(400).json({ error: "TP 不符" });

    let expectRlc;
    try {
      expectRlc = sign({ uid, ts });
    } catch (e) {
      console.error("sign error:", e);
      return res.status(400).json({ error: "TS/RLC 驗算失敗" });
    }
    if (!expectRlc || expectRlc.toLowerCase() !== rlc.toLowerCase()) {
      return res.status(403).json({ error: "RLC 驗證失敗" });
    }

    let card = await readCard(uid);
    if (!card) {
      return res.status(404).json({ error: `找不到卡片 uid=${uid}` });
    }

    // 防止重播攻擊
    if (card.last_ts && ts <= card.last_ts) {
      return res.status(403).json({ error: "TS 不合法 (重播攻擊)" });
    }

    // 更新卡片最後使用時間，補上 uid
    card.uid = uid;
    card.last_ts = ts;
    card.last_seen = safeNowString();
    await writeCard(uid, card);

    const token = Buffer.from(
      `${uid}:${d}:${Date.now()}:${ts}`
    ).toString("base64");

    const status = card.status === "ACTIVE" ? "ACTIVE" : "PENDING";
    return res.json({ status, token });
  } catch (err) {
    console.error("verify fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
