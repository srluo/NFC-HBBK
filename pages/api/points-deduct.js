/*****************************************************
 * Points 扣點 API v3.3 — 商化版（允許重卜，多次扣點）
 * ---------------------------------------------------
 * 移除 Redis fortune:<UID>:Date 鎖定機制。
 * 每次呼叫皆視為一次新交易，只要點數足夠即扣 1 點。
 * 扣點後自動寫入 card:<UID>:txlog（保留最近 10 筆）。
 * ---------------------------------------------------
 * Ver: 2025.11.10
 *****************************************************/

import { redis } from "../../lib/redis";
const TZ = "Asia/Taipei";

export default async function handler(req, res) {
  try {
    const { token, service } = req.query;
    if (!token || !service) return res.status(400).json({ error: "缺少參數" });

    // 解析 token（Base64: UID14:TS8:RAND8[:EXP]）
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [uid] = decoded.split(":");
    if (!uid) return res.status(400).json({ error: "Token 格式錯誤" });

    // 讀取卡片資料
    const cardKey = `card:${uid}`;
    const card = await redis.hgetall(cardKey);
    if (!card || !("points" in card))
      return res.status(404).json({ error: "找不到卡片資料" });

    const current = Number(card.points || 0);
    if (current <= 0) return res.status(403).json({ error: "點數不足" });

    // 扣點
    await redis.hincrby(cardKey, "points", -1);

    // 寫入交易紀錄
    const txItem = {
      type: service,
      deducted: 1,
      points_after: current - 1,
      date: new Date().toLocaleString("zh-TW", { timeZone: TZ }),
    };

    const txListKey = `card:${uid}:txlog`;
    await redis.lpush(txListKey, JSON.stringify(txItem));
    await redis.ltrim(txListKey, 0, 9); // 保留最近 10 筆

    // 回傳成功
    res.status(200).json({
      ok: true,
      service,
      deducted: 1,
      message: `已扣 1 點（目前餘額：${current - 1} 點）`,
      serviceToken: token,
      date: txItem.date,
    });
  } catch (err) {
    console.error("[points-deduct.js] Error:", err);
    res.status(500).json({ error: "系統錯誤：" + err.message });
  }
}