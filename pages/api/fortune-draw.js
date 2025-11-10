/*****************************************************
 * 今日運勢分析 API v3.6.0 (for NFC Birthday Book)
 * ---------------------------------------------------
 * 改進重點：
 * 1️⃣ 單一寫入 TXLOG（不再由 points-deduct 重複紀錄）
 * 2️⃣ 安全處理 points_before / after
 * 3️⃣ Fortune 結果自動寫入 localStorage 快取（前端依 key）
 * ---------------------------------------------------
 * Author: Roger Luo｜NFCTOGO
 * Date: 2025.11.10
 *****************************************************/
import OpenAI from "openai";
import { redis } from "../../lib/redis";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TZ = "Asia/Taipei";

export default async function handler(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "缺少 token" });

    // ------------------------------------------------------------
    // Token 解析
    // ------------------------------------------------------------
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [uid, ts, rand] = decoded.split(":");
    if (!uid) return res.status(400).json({ error: "Token 格式錯誤" });

    const cardKey = `card:${uid}`;
    const card = await redis.hgetall(cardKey);
    if (!card) return res.status(404).json({ error: "找不到卡片資料" });

    const sign = card.constellation || "未知";
    const blood = card.blood_type || "未知";
    const currentPoints = Number(card.points || 0);

    // ------------------------------------------------------------
    // 生成 AI 結果
    // ------------------------------------------------------------
    const summaryPrompt = `
你是一位結合星座與血型的 AI 命理師。
請根據「${sign}」與「${blood} 型」，
生成一段約 180～220 字的今日整體運勢，
包含：情緒、人際、能量、機會。
語氣溫暖、自然，避免重複詞。
`;

    const suggestionPrompt = `
請根據「${sign}」與「${blood} 型」，
生成一段今日的「行動建議」，
語氣具體、平衡，約 120～180 字。
`;

    const [summaryRes, suggestionRes] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: summaryPrompt }],
        temperature: 0.7,
        max_tokens: 600,
      }),
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: suggestionPrompt }],
        temperature: 0.7,
        max_tokens: 400,
      }),
    ]);

    const summary = summaryRes.choices[0].message.content.trim();
    const suggestion = suggestionRes.choices[0].message.content.trim();

    // ------------------------------------------------------------
    // 扣點邏輯（僅第一次扣）
    // ------------------------------------------------------------
    const today = new Date().toISOString().slice(0, 10);
    const flagKey = `fortune:${uid}:${today}`;
    const done = await redis.get(flagKey);
    let deducted = 0;
    let before = currentPoints;
    let after = currentPoints;

    if (!done) {
      if (currentPoints <= 0)
        return res.status(403).json({ error: "點數不足" });

      deducted = 1;
      after = currentPoints - 1;

      await redis
        .multi()
        .hincrby(cardKey, "points", -1)
        .set(flagKey, "1", { EX: 60 * 60 * 24 })
        .exec();
    }

    // ------------------------------------------------------------
    // 寫入 TXLOG（card:<uid>:txlog）
    // ------------------------------------------------------------
    const txlogKey = `card:${uid}:txlog`;
    const record = {
      type: "fortune",
      service: "西洋占星・今日運勢",
      deducted,
      points_before: before,
      points_after: after,
      sign,
      blood,
      summary,
      suggestion,
      date: new Date().toLocaleString("zh-TW", { timeZone: TZ }),
    };
    await redis.lpush(txlogKey, JSON.stringify(record));
    await redis.ltrim(txlogKey, 0, 9);

    // ------------------------------------------------------------
    // 回傳結果
    // ------------------------------------------------------------
    return res.status(200).json({
      ok: true,
      deducted,
      sign,
      blood,
      summary,
      suggestion,
      points_before: before,
      points_after: after,
      message: deducted
        ? "✅ 已扣 1 點並完成今日運勢。"
        : "☀️ 今日運勢已完成（未重複扣點）。",
    });
  } catch (err) {
    console.error("[fortune-draw.js] Error:", err);
    res.status(500).json({ error: "系統錯誤：" + err.message });
  }
}