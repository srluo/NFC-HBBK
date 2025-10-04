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
  // a <= b ? 以 16 進位比大小
  const na = parseInt(a, 16);
  const nb = parseInt(b, 16);
  if (Number.isNaN(na) || Number.isNaN(nb)) return false;
  return na <= nb;
}

export default async function handler(req, res) {
  try {
    const { d, uuid } = req.query;
    if (!d || !uuid) return res.status(400).json({ error: "缺少參數" });

    // 解析動態碼：UID(14) + TP(2=HB) + TS(8) + RLC(8)
    const uid = uuid.slice(0, 14);
    const tp  = uuid.slice(14, 16);
    const ts  = uuid.slice(16, 24);
    const rlc = uuid.slice(24);

    if (tp !== "HB") return res.status(400).json({ error: "TP 不符" });
    if (ts.length !== 8 || rlc.length !== 8)
      return res.status(400).json({ error: "TS / RLC 長度錯誤" });

    // 驗算 RLC（Mickey 1.0，key=FFFFFF+uid, iv=ts）
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

    const key = `card:${uid}`;
    // ✅ 僅用 Hash 讀資料
    const card = await redis.hgetall(key);
    if (!card || Object.keys(card).length === 0) {
      return res.status(404).json({ error: `找不到卡片 uid=${uid}` });
    }

    // 防重播（TS 必須遞增）
    if (card.last_ts && hexLE(ts, card.last_ts)) {
      return res.status(403).json({ error: "TS 不合法 (重播攻擊)" });
    }

    // ✅ 僅更新必要欄位（Hash，不覆蓋其他欄位）
    await redis.hset(key, {
      uid,
      last_ts: ts,
      last_seen: safeNowString(),
      updated_at: Date.now().toString(),
    });

    // 簽發 token：uid:d:issuedAt:ts （Base64）
    const token = Buffer.from(`${uid}:${d}:${Date.now()}:${ts}`).toString("base64");

    const status = card.status === "ACTIVE" ? "ACTIVE" : "PENDING";
    return res.json({ status, token });
  } catch (err) {
    console.error("verify fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
