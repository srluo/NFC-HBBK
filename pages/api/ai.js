// /pages/api/ai.js — v1.7.5 雙段式摘要版（洞察 + 鼓勵）
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

    // 🧩 新版 Prompt Seed
    const prompt = `
你是一位結合心理學與紫微斗數的生命教練，請根據以下資料撰寫「生日書個性摘要」。
請以溫暖、自然、真誠的語氣撰寫，內容分為兩段：

第一段：描述此人的內在特質與能量，展現其獨特個性與生命節奏。
第二段：給予他鼓勵與方向，引導他如何運用這些特質在生活或人際中成長。

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

請以繁體中文撰寫，總長約 120～160 字。  
語氣要像理解他的人，而非命理老師；避免出現「像一條...」、「你是...的人」等直接比喻。  
可以用「他／她身上帶有…的氣息」、「這樣的特質讓人感受到…」、「這股能量引領他／她…」等說法。
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位結合心理學、星座與紫微命理的生命教練，擅長以溫柔而深刻的文字描繪人的特質與潛能。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 250,
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || "";

    return res.json({ ok: true, summary });
  } catch (e) {
    console.error("ai.js error:", e);
    return res.status(500).json({ error: "AI 生成失敗" });
  }
}