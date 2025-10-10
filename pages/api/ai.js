// /pages/api/ai.js — v1.9.1B（紫微融合 + 全人格摘要）
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      return res.status(400).json({
        error: "缺少必要參數 (name, constellation, zodiac)",
      });

    // 🧩 AI Prompt 結構化模板
    const prompt = `
你是一位結合紫微斗數與心理學的「人格顧問」，請根據以下個人資料，撰寫一段約 120～160 字的「個性總結」：
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
請以「溫暖、自然、富洞察力」的口吻撰寫，避免命理口氣（不要說“你是某某命格”、“像某某生肖”）。  
文中需：
1️⃣ 描述此人的整體性格與能量傾向。  
2️⃣ 指出可發揮的潛能或優點。  
3️⃣ 提出應注意的性格盲點或挑戰。  
4️⃣ 結尾以一句鼓勵語作收。  
請用繁體中文撰寫，避免使用代名詞「他／她」，直接以第二人稱「你」敘述。
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位融合紫微斗數與人格心理學的顧問，擅長用溫暖、正面且誠實的語氣撰寫個人化分析摘要。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 250,
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || "";

    return res.json({ ok: true, summary });
  } catch (e) {
    console.error("ai.js error:", e);
    return res.status(500).json({ error: "AI 生成失敗" });
  }
}
