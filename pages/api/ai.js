// /pages/api/ai.js — v1.8.5 balance-persona
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
      bureau,
      ming_lord,
      shen_lord,
      ming_stars,
      blood_type,
    } = req.body || {};

    if (!constellation || !zodiac || !ming_lord)
      return res
        .status(400)
        .json({ error: "缺少必要參數 (constellation, zodiac, ming_lord)" });

    // 🌗 三段式 + 陰陽人格 + 中性描述
    const prompt = `
請以心理學與紫微斗數結合的角度，撰寫一段完整且平衡的個性摘要，分為三段：
1️⃣ 第一段：描述此生命格的整體氣質與核心特質（正面能量）。
2️⃣ 第二段：指出此人格在情緒、人際、或決策上可能的盲點或課題（陰面特質）。
3️⃣ 第三段：給予具體可行的建議與成長方向。

⚠️ 注意事項：
- 不可使用「你」「他」「她」等稱呼，改用中性描述（如「此生命格」「這份氣質」）。
- 不要直接提及生肖、星座、血型名稱。
- 語氣自然溫和、有啟發性，字數約 150～200 字。
- 以自然分段呈現（保留換行符號 \\n\\n）。

以下是資料：
性別：${gender || "未指定"}
星座：${constellation}
生肖：${zodiac}
血型：${blood_type || "未填"}
五行局：${bureau || "未知"}
命主星：${ming_lord}
身主星：${shen_lord}
命宮主星：${Array.isArray(ming_stars) ? ming_stars.join("、") : ming_stars}
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位融合紫微斗數與心理分析的性格顧問，擅長以平衡、具療癒力的語氣撰寫個性剖析。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 260,
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || "";
    return res.json({ ok: true, summary });
  } catch (e) {
    console.error("ai.js error:", e);
    return res.status(500).json({ error: "AI 生成失敗" });
  }
}
