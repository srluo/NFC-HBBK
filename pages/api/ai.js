// /pages/api/ai.js — v1.7.7B 改進版（整合心理學＋紫微＋整體觀點）
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

    if (!name || !constellation || !zodiac)
      return res.status(400).json({ error: "缺少必要參數" });

    // 🧩 AI Prompt Seed — 改進語意設計
    const prompt = `
你是一位結合心理學、星座分析與紫微斗數觀點的「個性顧問」。
請根據以下資訊，撰寫一段 120～160 字的「個人化開卡摘要」，語氣自然、溫暖、真誠、有洞察力。
不要直譯生肖或星座特質，也不要出現命理口吻或生硬比喻。
請強調「人格能量」與「生活中可實踐的啟發」，最後給一句總結性建議。

---
姓名：${name}
性別：${gender || "未指定"}
生肖：${zodiac}
星座：${constellation}
血型：${blood_type || "未填"}
五行局：${bureau || "未計算"}
命主星：${ming_lord || "未知"}
身主星：${shen_lord || "未知"}
命宮主星：${Array.isArray(ming_stars) ? ming_stars.join("、") : ming_stars || "無資料"}
---

請以繁體中文撰寫，用溫暖的第二人稱（例如「你擁有」「你展現」等），
避免出現「像⋯⋯的⋯⋯」或生硬比喻。
最後請以一句溫柔、鼓勵性的語句收尾。
`;

    // 🧠 GPT 請求
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位結合心理學與紫微人格分析的文字顧問，擅長以溫暖、細膩、啟發性的語氣撰寫個人化摘要。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 250,
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || "";

    // ✅ Fallback（確保有回傳）
    const safeSummary =
      summary ||
      "你擁有穩定而細膩的內在力量，能在生活中保持溫柔與堅定。面對挑戰時，你懂得轉化壓力為成長的動力。願你在每個日常片刻裡，都能活出真實與自在的自己。";

    return res.json({ ok: true, summary: safeSummary });
  } catch (e) {
    console.error("ai.js error:", e);
    return res.status(500).json({
      error: "AI 生成失敗",
      summary:
        "目前系統繁忙，請稍後再嘗試生成個性摘要。你依然擁有無限潛能，值得用心探索每一個當下。",
    });
  }
}
