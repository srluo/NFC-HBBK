// /pages/api/ai.js — v1.9.4 Stable 
// ------------------------------------------------------------
// AI Personality Summary Engine v1.9.4 Stable
// 作者：Roger Luo｜NFCTOGO 研究出版
// 日期：2025.10.19
// 架構：三段式摘要（紫微 × 星座 × 血型）
// 用途：生成生日書主頁「性格摘要」區塊內容
// 模型：gpt-4o-mini（temperature 0.8 / max_tokens 240）
// ✅ 重點更新：
// 1️⃣ 明確要求三段開頭加標題（性格特質／潛能優點／注意事項與建議）。
// 2️⃣ 禁止出現人名（如 Roger）與第三人稱。
// 3️⃣ 使用第二人稱「你」描述。
// 4️⃣ 字數控制在 130～160 字（不被截斷）。
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

    if (!constellation || !zodiac)
      return res.status(400).json({ error: "缺少必要參數" });

    const prompt = `
你是一位人格心理顧問，根據以下資料撰寫一段約 130～160 字的「個性摘要」：
---
性別：${gender || "未指定"}
生肖：${zodiac}
星座：${constellation}
血型：${blood_type || "未填"}
五行局：${bureau || "未知"}
命主星：${ming_lord || "未知"}
身主星：${shen_lord || "未知"}
命宮主星群：${Array.isArray(ming_stars) ? ming_stars.join("、") : ming_stars || "無"}
---
撰寫要求：
1️⃣ 禁止出現任何人名（如 ${name}）。  
2️⃣ 禁止使用第三人稱（如「他」「她」），一律用「你」開頭敘述。  
3️⃣ 不得重複提及星座或生肖名稱。  
4️⃣ 以溫暖、自然、具洞察力的語氣撰寫。  
5️⃣ 全文分為三段，每段開頭請加上標題：  
   - 性格特質：  
   - 潛能優點：  
   - 注意事項與建議：  
6️⃣ 每段之間以兩個換行符號（\\n\\n）分隔。  
7️⃣ 全文長度控制在 130～160 字之間。
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位融合心理學與紫微觀察的顧問，擅長以第二人稱撰寫自然、誠懇、結構分明的個性摘要。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 240,
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || "";
    return res.json({ ok: true, summary });
  } catch (e) {
    console.error("ai.js error:", e);
    return res.status(500).json({ error: "AI 生成失敗" });
  }
}