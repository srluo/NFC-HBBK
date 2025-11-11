/*****************************************************
 * Points 扣點 API v3.3.1 — 加入 points_before
 *****************************************************/
import { redis } from "../../lib/redis";
const TZ = "Asia/Taipei";

export default async function handler(req, res) {
  try {
    const { token, service } = req.query;
    if (!token || !service) return res.status(400).json({ error: "缺少參數" });

    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [uid] = decoded.split(":");
    if (!uid) return res.status(400).json({ error: "Token 格式錯誤" });

    const cardKey = `card:${uid}`;
    const card = await redis.hgetall(cardKey);
    if (!card || !("points" in card))
      return res.status(404).json({ error: "找不到卡片資料" });

    const before = Number(card.points || 0);
    if (before <= 0) return res.status(403).json({ error: "點數不足" });

    const after = before - 1;
    await redis.hincrby(cardKey, "points", -1);

    // 寫入 TXLOG
    const txItem = {
      type: service,
      deducted: 1,
      points_before: before,    // ✅ 加入
      points_after: after,
      date: new Date().toLocaleString("zh-TW", { timeZone: TZ }),
    };
    const txListKey = `card:${uid}:txlog`;
    await redis.lpush(txListKey, JSON.stringify(txItem));
    await redis.ltrim(txListKey, 0, 9);

    res.status(200).json({
      ok: true,
      service,
      deducted: 1,
      message: `已扣 1 點（目前餘額：${after} 點）`,
      serviceToken: token,
      date: txItem.date,
      points_before: before,     // ✅ 同步回傳前端
      points_after: after,
    });
  } catch (err) {
    console.error("[points-deduct.js] Error:", err);
    res.status(500).json({ error: "系統錯誤：" + err.message });
  }
}