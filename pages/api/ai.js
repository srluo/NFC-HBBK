// /pages/api/ai.js — v2.1.1-structured-clean
// ✅ 四段式自然分段版（不使用「一、二、三」編號）
// ✅ 每段加上自然標題（性格特質／潛能優點／注意事項／鼓勵語）
// ✅ 避免命理語氣，強調心理洞察與生活建議
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

    // ✨ 四段式摘要結構（不含編號）
    const prompt = `
你是一位融合紫微斗數與心理學的顧問。請根據以下個人資料，生成一份約 180～220 字的「AI 個性摘要」。
全文分為四段，請以自然的段落標題呈現（不要數字或條列符號），並以繁體中文書寫。
語氣溫暖、誠懇、具洞察力，像在給出真誠的建議。避免命理口吻與直接提及星座或生肖。

段落結構如下：
---
性格特質：
（描述整體性格能量與人際特質）

潛能與優點：
（指出可發揮的長處與天賦）

需要注意的地方：
（說明可能的性格盲點、挑戰或誤區）

鼓勵與建議：
（給出一段真誠、溫柔的勉勵語）
---

個人資料：
姓名：${name}
性別：${gender || "未指定"}
星座：${constellation}
生肖：${zodiac}
血型：${blood_type || "未填"}
五行局：${bureau || "未知"}
命主星：${ming_lord || "未知"}
身主星：${shen_lord || "未知"}
命宮主星群：${Array.isArray(ming_stars) ? ming_stars.join("、") : ming_stars || "無"}

請生成一份自然分段的文字，每段之間留一行空白。
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位融合紫微斗數與心理學的個性分析師，擅長以溫暖、人性化的語氣撰寫分析摘要。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 350,
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || "";

    return res.json({ ok: true, summary });
  } catch (e) {
    console.error("ai.js error:", e);
    return res.status(500).json({ error: "AI 生成失敗" });
  }
}
