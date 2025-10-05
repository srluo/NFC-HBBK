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
  } catch {
    const t = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return t.toISOString().replace("T", " ").slice(0, 19);
  }
}

function hexLE(a, b) {
  const na = parseInt(a, 16);
  const nb = parseInt(b, 16);
  if (Number.isNaN(na) || Number.isNaN(nb)) return false;
  return na <= nb;
}

export default async function handler(req, res) {
  try {
    const { d, uuid } = req.query;
    if (!d || !uuid) return res.status(400).json({ error: "缺少參數" });

    // 解析 UID + TP + TS + RLC
    const uid = uuid.slice(0, 14);
    const tp  = uuid.slice(14, 16);
    const ts  = uuid.slice(16, 24);
    const rlc = uuid.slice(24);

    if (tp !== "HB") return res.status(400).json({ error: "TP 不符" });
    if (ts.length !== 8 || rlc.length !== 8)
      return res.status(400).json({ error: "TS / RLC 長度錯誤" });

    // ✅ RLC 驗證
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

    // ✅ 讀取卡片資料（Hash）
    const key = `card:${uid}`;
    const card = await redis.hgetall(key);
    if (!card || Object.keys(card).length === 0) {
      return res.status(404).json({ error: `找不到卡片 uid=${uid}` });
    }

    // ✅ 防重播（TS 必須遞增）→ 放在更新 last_ts 前！
    if (card.last_ts && hexLE(ts, card.last_ts)) {
      console.warn(`⚠️ TS 不合法: ts=${ts}, last_ts=${card.last_ts}`);
      return res.status(403).json({ error: "TS 不合法 (重播攻擊)" });
    }

    // ✅ 通過所有驗證 → 更新 Hash
    await redis.hset(key, {
      uid,
      last_ts: ts,
      last_seen: safeNowString(),
      updated_at: Date.now().toString(),
    });

    // ✅ 簽發 token
    const token = Buffer.from(`${uid}:${d}:${Date.now()}:${ts}`).toString("base64");
    const status = card.status === "ACTIVE" ? "ACTIVE" : "PENDING";

    return res.json({ status, token });
  } catch (err) {
    console.error("verify fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
