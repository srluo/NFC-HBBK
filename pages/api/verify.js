import { redis } from "../../lib/redis";
import { sign } from "../../lib/sign";

export default async function handler(req, res) {
  const { d, uuid } = req.query;
  if (!d || !uuid) {
    return res.status(400).json({ error: "缺少參數" });
  }

  const uid = uuid.slice(0, 14);
  const tp = uuid.slice(14, 16);
  const ts = uuid.slice(16, 24);
  const rlc = uuid.slice(24);

  if (tp !== "HB") {
    return res.status(400).json({ error: "TP 不符" });
  }

  // 驗證 RLC
  const expectRlc = sign({ uid, ts });
  if (expectRlc.toLowerCase() !== rlc.toLowerCase()) {
    return res.status(403).json({ error: "RLC 驗證失敗" });
  }

  // 讀取卡片資料
  let card = await redis.get(`card:${uid}`);
  card = card ? JSON.parse(card) : null;

  if (card) {
    // 檢查 TS 遞增
    if (card.last_ts && ts <= card.last_ts) {
      return res.status(403).json({ error: "TS 不合法 (重播攻擊)" });
    }

    // 更新 TS 與 last_seen
    card.last_ts = ts;
    card.last_seen = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    await redis.set(`card:${uid}`, JSON.stringify(card));

    if (card.status === "ACTIVE") {
      return res.json({ status: "ACTIVE", token: Buffer.from(`${uid}:${d}:${Date.now()}:${ts}`).toString("base64") });
    }
  }

  // 如果沒卡片或 PENDING
  const token = Buffer.from(`${uid}:${d}:${Date.now()}:${ts}`).toString("base64");
  return res.json({ status: "PENDING", token });
}