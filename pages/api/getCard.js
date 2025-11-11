/*****************************************************
 * getCard API v3.3.6 — Commercial Sync 正式修正版
 * ---------------------------------------------------
 * 1️⃣ 主檔：card:<UID>（Hash）
 * 2️⃣ 交易紀錄：card:<UID>:txlog（List, 最近 10 筆）
 * 3️⃣ pins / subscriptions / four_pillars / ziweis 均安全補值
 * ---------------------------------------------------
 * Ver: 2025.11.11
 *****************************************************/

import { redis } from "../../lib/redis";

export default async function handler(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "缺少 token" });

    // ------------------------------
    // 解碼 token（Base64: UID14:TS8:RAND8[:EXP]）
    // ------------------------------
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [uid] = decoded.split(":");
    if (!uid) return res.status(400).json({ error: "Token 格式錯誤" });

    // ------------------------------
    // 讀取主檔 Hash
    // ------------------------------
    const cardKey = `card:${uid}`;
    const card = await redis.hgetall(cardKey);
    if (!card || Object.keys(card).length === 0)
      return res.status(404).json({ error: "找不到卡片資料" });

    // ------------------------------
    // 讀取交易紀錄 List（強韌解析）
    // ------------------------------
    const txKey = `card:${uid}:txlog`;
    const txList = await redis.lrange(txKey, 0, 9);
    const txlog = txList.map((t, i) => {
      try {
        if (!t) return {};
        if (typeof t === "object" && t !== null) return t;
        const cleaned = String(t).replace(/^"+|"+$/g, "").trim();
        if (cleaned.startsWith("{") && cleaned.endsWith("}"))
          return JSON.parse(cleaned);
        return {};
      } catch (err) {
        console.warn(`[getCard] TXLOG parse failed @${i}:`, err);
        return {};
      }
    });

    // ------------------------------
    // 欄位轉型與安全補值
    // ------------------------------
    const parsedCard = {
      ...card,
      points: Number(card.points ?? 0),
      txlog,
    };

    // ✅ pins：確保為物件
    if (typeof parsedCard.pins === "string") {
      try {
        parsedCard.pins = JSON.parse(parsedCard.pins);
      } catch {
        parsedCard.pins = { enabled: false };
      }
    }
    if (!parsedCard.pins || typeof parsedCard.pins !== "object")
      parsedCard.pins = { enabled: false };

    // ✅ subscriptions：確保為物件
    if (typeof parsedCard.subscriptions === "string") {
      try {
        parsedCard.subscriptions = JSON.parse(parsedCard.subscriptions);
      } catch {
        parsedCard.subscriptions = {};
      }
    }
    if (!parsedCard.subscriptions || typeof parsedCard.subscriptions !== "object")
      parsedCard.subscriptions = {};

    // ✅ four_pillars / ziweis：自動 JSON.parse
    for (const key of ["four_pillars", "ziweis"]) {
      if (typeof parsedCard[key] === "string") {
        try {
          parsedCard[key] = JSON.parse(parsedCard[key]);
        } catch {
          parsedCard[key] = {};
        }
      }
    }

    // ------------------------------
    // 回傳結果
    // ------------------------------
    res.status(200).json({
      ok: true,
      card: parsedCard,
    });
  } catch (err) {
    console.error("[getCard.js] Error:", err);
    res.status(500).json({ error: "系統錯誤：" + err.message });
  }
}