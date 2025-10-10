// /pages/api/ai.js — v1.7.1 智能層級摘要版
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

    if (!name || !constellation)
      return res.status(400).json({ error: "缺少必要參數 (name, constellation)" });

    // 🧩 自動偵測資料完整層級
    let level = "basic";
    if (ming_lord && shen_lord && bureau) level = "ziwei";
    else if (zodiac && gender) level = "personality";

    // 🧭 各層級對應語氣與提示
    let focus = "";
    switch (level) {
      case "basic":
        focus = `請根據星座與血型，描繪此人的基本性格與待人態度，文字約120字左右。`;
        break;
      case "personality":
        focus = `結合生肖、星座、血型與性別，展現其內在特質與人際風格，約130字左右。`;
        break;
      case "ziwei":
        focus = `結合紫微命理（命主星、身主星、五行局、命宮主星）與心理特質，撰寫一段約150字的完整人生氣質摘要。`;
        break;
    }

    const prompt = `
你是一位結合心理學與紫微斗數的生命分析師，請以溫暖、自然、正面的語氣撰寫個人化摘要。
---
姓名：${name}
性別：${gender || "未指定"}
生肖：${zodiac || "未知"}
星座：${constellation}
血型：${blood_type || "未填"}
五行局：${bureau || "未填"}
命主星：${ming_lord || "未填"}
身主星：${shen_lord || "未填"}
命宮主星：${Array.isArray(ming_stars) ? ming_stars.join("、") : ming_stars || "未填"}
---
${focus}
請使用繁體中文，語氣柔和、有同理心，避免使用命理術語，以「這樣的你…」開頭。
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "你是一位結合紫微斗數與心理學的生命顧問。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 300,
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || "";

    return res.json({ ok: true, level, summary });
  } catch (e) {
    console.error("ai.js error:", e);
    return res.status(500).json({ error: "AI 生成失敗" });
  }
}