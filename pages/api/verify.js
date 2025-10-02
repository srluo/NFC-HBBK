import { redis } from "@/lib/redis";
import { sign } from "@/lib/sign";

export default async function handler(req, res) {
  const { d, uuid } = req.query;
  if (!uuid || !d) return res.status(400).json({ error: "缺少參數" });

  try {
    const uid = uuid.slice(0, 14);
    const tp = uuid.slice(14, 16);
    const ts = uuid.slice(16, 24);
    const rlc = uuid.slice(24, 32);

    if (tp !== "HB") {
      return res.status(400).json({ error: "TP 錯誤" });
    }

    const lastTsKey = `ts:${uid}`;
    const lastTs = await redis.get(lastTsKey);
    if (lastTs && parseInt(ts, 16) <= parseInt(lastTs, 16)) {
      return res.status(400).json({ error: "TS 無效 (重播攻擊)" });
    }

    const calc = sign({ uid, ts });
    if (calc.toLowerCase() !== rlc.toLowerCase()) {
      return res.status(400).json({ error: "RLC 驗證失敗" });
    }

    await redis.set(lastTsKey, ts);

    const cardKey = `card:${uid}`;
    const card = await redis.hgetall(cardKey);
    let status = "PENDING";
    if (card && card.status === "ACTIVE") status = "ACTIVE";

    const token = Buffer.from(`${uid}:${d}:${Date.now()}:${ts}`).toString("base64");

    return res.json({ status, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "系統錯誤" });
  }
}
