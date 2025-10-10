// /pages/api/ai.js — v2.0.2（禁止 Markdown + 自然分段版）
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
      return res
        .status(400)
        .json({ error: "缺少必要參數 (name, constellation, zodiac)" });

    // 🧩 AI Prompt 模板 — 禁止 Markdown 輸出
    const prompt = `
你是一位融合紫微斗數與心理學的「人格顧問」，請根據以下資料撰寫一段約 180～200 字的「個性分析摘要」：
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
撰寫規則：
1️⃣ 全文請使用「你」作為稱呼，不要使用「他／她」或重複姓名。
2️⃣ 不要使用 Markdown 標記符號（例如 #、###、*、-、\\n\\n），請輸出乾淨的自然文字。
3️⃣ 避免直白提及星座或生肖名稱。
4️⃣ 以溫暖、真誠、具洞察力的語氣撰寫。
5️⃣ 分為四個自然段，並用中文標題開頭：
　性格特質：
　潛能與優點：
　需要注意的地方：
　鼓勵與建議：
6️⃣ 每段之間保留一個自然換行即可（不要插入 \\n 或符號）。
7️⃣ 用繁體中文輸出。
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content:
            "你是一位融合紫微斗數與心理學的顧問，擅長以溫暖、真誠、富洞察力的語氣撰寫個性分析摘要。",
        },
        { role: "user", content: prompt },
      ],
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || "";
    return res.json({ ok: true, summary });
  } catch (e) {
    console.error("ai.js error:", e);
    return res.status(500).json({ error: "AI 生成失敗" });
  }
}
