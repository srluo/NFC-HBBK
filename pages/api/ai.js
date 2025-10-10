// /pages/api/ai.js — v1.8.0 封存強化版
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
      return res
        .status(400)
        .json({ error: "缺少必要參數 (name, constellation, zodiac)" });

    // 🧩 組合個性分析模組（動態提示）
    let modules = [`星座：${constellation}`, `生肖：${zodiac}`];
    if (blood_type) modules.push(`血型：${blood_type}`);
    if (bureau) modules.push(`五行局：${bureau}`);
    if (ming_lord) modules.push(`命主星：${ming_lord}`);
    if (shen_lord) modules.push(`身主星：${shen_lord}`);
    if (Array.isArray(ming_stars) && ming_stars.length > 0)
      modules.push(`命宮主星：${ming_stars.join("、")}`);
    const infoBlock = modules.join(" / ");

    // 🎯 Prompt 模板：結合人格心理與命理結構
    const prompt = `
你是一位結合心理學與紫微斗數的個性顧問，請根據以下個人資料生成一段自然、溫暖且具有洞察力的「生日書摘要」：
---
姓名：${name}
性別：${gender || "未指定"}
${infoBlock}
---

請以繁體中文撰寫，約 120～160 字，語氣要柔和、鼓舞人心，重點放在人格特質與行動建議的融合，
不要使用「像⋯⋯的動物」或「你是一個⋯⋯的人」等直接比喻，
而是以理解與引導的語氣，說明這樣的人的能量特質與潛在方向。
請用兩段落：
第一段：描述核心特質與個性氛圍；
第二段：給出一段正向、生活化的鼓勵或行動建議。`;

    // 🚀 呼叫 OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位人格心理顧問，擅長融合星座、血型與紫微命盤的心理分析，用溫暖語氣撰寫個人化摘要。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 220,
    });

    const summary = completion.choices?.[0]?.message?.content?.trim();

    // ⏳ fallback（AI 無回應或逾時）
    const fallback =
      "這樣的你，兼具感性與理性，懂得在變化中保持平衡。你的內在蘊藏著穩定的力量，能以柔和的方式影響他人，讓周圍的世界更加和諧。";

    res.json({
      ok: true,
      summary: summary || fallback,
    });
  } catch (e) {
    console.error("❌ ai.js error:", e);
    res.status(500).json({
      ok: false,
      error: "AI 生成失敗",
      summary:
        "這樣的你，擁有細膩的感受力與穩定的意志，即使面對挑戰，也能以溫柔而堅定的方式前進。這份能量是你最珍貴的力量。",
    });
  }
}