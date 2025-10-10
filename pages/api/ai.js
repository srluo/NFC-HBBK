// /pages/api/ai.js — v1.9.2（AI 摘要輕量優化）
// ------------------------------------------------------------
// ✅ 重點更新：
// 1️⃣ 字數控制：限制 120–150 字。
// 2️⃣ 禁止重複提及星座／生肖名稱（減少冗語）。
// 3️⃣ 保留四段結構（整體、優點、注意、鼓勵），但語氣更精簡。
// ------------------------------------------------------------

import OpenAI from "openai";
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  try {
    if (req.method !== "POST")
      return res.status(405).json({ error: "Method Not Allowed" });

    const {
      name,
      gender,
      zodiac,
      constellation,
      blood_type,
      bureau,
      ming_lord,
      shen_lord,
      ming_stars,
    } = req.body || {};

    if (!name || !constellation || !zodiac)
      return res.status(400).json({ error: "缺少必要參數" });

    // 🎯 Prompt（120–150 字內）
    const prompt = `
你是一位人格心理顧問，根據以下資料撰寫一段約 120–150 字的「個性摘要」：
---
姓名：${name}
性別：${gender || "未指定"}
生肖：${zodiac}
星座：${constellation}
血型：${blood_type || "未填"}
五行局：${bureau || "未知"}
命主星：${ming_lord || "未知"}
身主星：${shen_lord || "未知"}
命宮主星群：${Array.isArray(ming_stars) ? ming_stars.join("、") : ming_stars || "無"}
---
要求：
1️⃣ 不要重複提及星座、生肖名稱。
2️⃣ 以溫暖、自然、具洞察力的語氣撰寫。
3️⃣ 分為三段：整體性格、潛能與優點、需注意缺點與鼓勵。
4️⃣ 每段間請加一個空行（\\n\\n）。
5️⃣ 字數請控制在 120～150 字內。
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位融合心理學與命理觀察的顧問，擅長用簡潔、誠懇、正面的語氣撰寫個人化摘要。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 220, // 控制生成上限
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || "";

    return res.json({ ok: true, summary });
  } catch (e) {
    console.error("ai.js error:", e);
    return res.status(500).json({ error: "AI 生成失敗" });
  }
}
