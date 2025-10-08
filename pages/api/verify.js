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
    if (!d || !uuid) {
      return res.status(400).json({ ok: false, error: "缺少參數" });
    }

    // 拆解 UID, TP, TS, RLC
    const uid = uuid.slice(0, 14);
    const tp  = uuid.slice(14, 16);
    const ts  = uuid.slice(16, 24);
    const rlc = uuid.slice(24);

    if (tp !== "HB") {
      return res.status(400).json({ ok: false, error: "TP 不符（非生日卡）" });
    }
    if (ts.length !== 8 || rlc.length !== 8) {
      return res.status(400).json({ ok: false, error: "TS / RLC 長度錯誤" });
    }

    // Mickey 1.0 驗章
    let expectRlc;
    try {
      expectRlc = sign({ uid, ts });
    } catch (e) {
      console.error("sign error:", e);
      return res.status(400).json({ ok: false, error: "TS/RLC 驗算失敗" });
    }

    if (!expectRlc || expectRlc.toLowerCase() !== rlc.toLowerCase()) {
      return res.status(403).json({ ok: false, error: "RLC 驗證失敗" });
    }

    // 查 Redis (UID 必須存在)
    const key = `card:${uid}`;
    const card = await redis.hgetall(key);

    if (!card || Object.keys(card).length === 0) {
      return res.status(403).json({
        ok: false,
        error: `UID 不存在，非法卡片 (uid=${uid})`,
        next: "stop",
      });
    }

    // 防重播檢查
    if (card.last_ts && hexLE(ts, card.last_ts)) {
      return res.status(403).json({ ok: false, error: "TS 已過期 (無效網址)" });
    }

    // 更新 Redis 使用紀錄
    await redis.hset(key, {
      last_ts: ts,
      last_seen: safeNowString(),
      updated_at: Date.now().toString(),
    });

    // 建立一次性 token
    const token = Buffer.from(`${uid}:${d}:${Date.now()}:${ts}`).toString("base64");

    // 決定狀態
    const isActive = card.status === "ACTIVE" || card.opened === "true";
    const next = isActive ? "book" : "activate";
    const message = isActive ? "卡片已開啟 📖" : "等待開卡 ✨";

    return res.json({
      ok: true,
      status: card.status,
      next,
      token,
      message,
    });

  } catch (err) {
    console.error("verify fatal error:", err);
    return res.status(500).json({ ok: false, error: "伺服器錯誤" });
  }
}