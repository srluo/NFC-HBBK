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

export default async function handler(req, res) {
  try {
    const { d, uuid } = req.query;
    if (!d || !uuid) {
      return res.status(400).json({ ok: false, error: "缺少參數" });
    }

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

    // ✅ RLC 驗章
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

    const key = `card:${uid}`;
    const card = await redis.hgetall(key);
    if (!card || Object.keys(card).length === 0) {
      return res.status(404).json({ ok: false, error: `找不到卡片 uid=${uid}` });
    }

    // ✅ TS 只擋倒退，不擋同值
    const lastTs = card.last_ts || "00000000";
    if (parseInt(ts, 16) < parseInt(lastTs, 16)) {
      return res.status(403).json({ ok: false, error: "TS 無效 (重播攻擊?)" });
    }

    await redis.hset(key, {
      uid,
      last_ts: ts,
      last_seen: safeNowString(),
      updated_at: Date.now().toString(),
    });

    const token = Buffer.from(`${uid}:${d}:${Date.now()}:${ts}`).toString("base64");
    const status = card.status === "ACTIVE" ? "ACTIVE" : "PENDING";

    return res.json({ ok: true, status, token });
  } catch (err) {
    console.error("verify fatal error:", err);
    return res.status(500).json({ ok: false, error: "伺服器錯誤" });
  }
}