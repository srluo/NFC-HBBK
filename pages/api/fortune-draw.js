/*****************************************************
 * 今日運勢分析 API v3.6.1 (for NFC Birthday Book)
 * ---------------------------------------------------
 * 改進重點：
 * ✅ 移除 Redis fortune:<uid>:date 鎖定機制
 * ✅ 保留 points_before / after
 * ✅ 單一 TXLOG 記錄（扣點＋結果）
 * ✅ 由前端 localStorage 控制重複使用
 * ---------------------------------------------------
 * Author: Roger Luo｜NFCTOGO
 * Date: 2025.11.11
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
    const [uid] = decoded.split(":");
    if (!uid) return res.status(400).json({ error: "Token 格式錯誤" });

    const cardKey = `card:${uid}`;
    const card = await redis.hgetall(cardKey);
    if (!card) return res.status(404).json({ error: "找不到卡片資料" });

    const sign = card.constellation || "未知";
    const blood = card.blood_type || "未知";
    const before = Number(card.points || 0);
    if (before <= 0) return res.status(403).json({ error: "點數不足" });

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
    // 💎 扣 1 點
    // ------------------------------------------------------------
    const after = before - 1;
    await redis.hincrby(cardKey, "points", -1);

    // ------------------------------------------------------------
    // 🧾 寫入 TXLOG
    // ------------------------------------------------------------
    const txlogKey = `card:${uid}:txlog`;
    const record = {
      type: "fortune",
      service: "西洋占星・今日運勢",
      deducted: 1,
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
    // ✅ 回傳結果
    // ------------------------------------------------------------
    return res.status(200).json({
      ok: true,
      sign,
      blood,
      summary,
      suggestion,
      points_before: before,
      points_after: after,
      message: "✅ 已扣 1 點並完成今日運勢。",
    });
  } catch (err) {
    console.error("[fortune-draw.js] Error:", err);
    res.status(500).json({ error: "系統錯誤：" + err.message });
  }
}