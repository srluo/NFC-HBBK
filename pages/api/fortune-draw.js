/*****************************************************
 * 📘 fortune-draw.js — v3.7 Final (LocalStorage-based)
 * ---------------------------------------------------
 * ✅ 只記錄 TXLOG，不再寫入 fortune:<UID>:<DATE>
 * ✅ 每次呼叫都會生成新運勢（由前端快取防重複）
 * ✅ 將結果存入 Redis txlog:<UID>:<timestamp>
 * ---------------------------------------------------
 * Ver: 2025.11.10
 *****************************************************/
import OpenAI from "openai";
import { redis } from "../../lib/redis";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TZ = "Asia/Taipei";

export default async function handler(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: "缺少 token" });

    // 解析 Base64 token
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [uid] = decoded.split(":");
    if (!uid) return res.status(400).json({ error: "Token 格式錯誤" });

    const card = await redis.hgetall(`card:${uid}`);
    if (!card) return res.status(404).json({ error: "找不到卡片資料" });

    const sign = card.constellation || "未知";
    const blood = card.blood_type || "未知";

    // 🧩 Prompt A: 整體運勢
    const summaryPrompt = `
你是一位結合星座與血型的 AI 命理師。
請根據「${sign}」與「${blood} 型」，
生成一段約 180～220 字的今日整體運勢，
包含：情緒、人際、能量、機會。
語氣溫暖誠懇，避免過度樂觀。
`;

    // 🧩 Prompt B: 行動建議
    const suggestionPrompt = `
請根據「${sign}」與「${blood} 型」，
生成一段今日的「行動建議」，
語氣具體溫和，約 120～180 字。
`;

    // ✨ 並行生成
    const [summaryRes, suggestionRes] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: summaryPrompt }],
        temperature: 0.7,
        max_tokens: 500,
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

    // 🧾 TXLOG 寫入（保留最近 10 筆）
    const txKey = `card:${uid}:txlog`;
    const txItem = {
      type: "fortune",
      sign,
      blood,
      summary: summary.slice(0, 200),
      suggestion: suggestion.slice(0, 200),
      date: new Date().toLocaleString("zh-TW", { timeZone: TZ }),
    };

    // 寫入 Redis List，保留最新 10 筆
    await redis.lpush(txKey, JSON.stringify(txItem));
    await redis.ltrim(txKey, 0, 9);

    // 🔁 回傳結果
    res.status(200).json({
      ok: true,
      sign,
      blood,
      summary,
      suggestion,
    });
  } catch (err) {
    console.error("[fortune-draw.js] Error:", err);
    res.status(500).json({ error: "系統錯誤：" + err.message });
  }
}