// /pages/api/ai.js — v1.6 智慧開卡版
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
      bureau,
      ming_lord,
      shen_lord,
      ming_stars,
      blood_type,
    } = req.body || {};

    if (!name || !constellation || !zodiac || !ming_lord)
      return res
        .status(400)
        .json({ error: "缺少必要參數 (name, constellation, zodiac, ming_lord)" });

    // 🧩 AI Prompt Seed 模板
    const prompt = `
你是一位紫微斗數與人格心理專家，請根據以下資料生成一段溫暖、自然、貼近人心的「生日書開卡摘要」：
---
姓名：${name}
性別：${gender || "未指定"}
生肖：${zodiac}
星座：${constellation}
血型：${blood_type || "未填"}
五行局：${bureau || "未知"}
命主星：${ming_lord}
身主星：${shen_lord}
命宮主星：${Array.isArray(ming_stars) ? ming_stars.join("、") : ming_stars}
---
請以繁體中文撰寫，約 80～120 字，語氣自然、正面、具有鼓舞性，
不要使用算命口吻，而像一位了解人性的智者，用溫柔的語氣告訴他「這樣的你」的獨特氣質與人生能量。
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位結合心理學與紫微斗數的個性顧問，擅長用溫暖、具洞察力的語氣撰寫個人化人生摘要。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 180,
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || "";

    return res.json({ ok: true, summary });
  } catch (e) {
    console.error("ai.js error:", e);
    return res.status(500).json({ error: "AI 生成失敗" });
  }
}