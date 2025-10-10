// /pages/api/ai.js — v1.7.3 智慧開卡（心理導向＋紫微層級）
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

    // ✅ 檢查必要參數
    if (!name || !constellation || !zodiac)
      return res.status(400).json({ error: "缺少必要參數 (name, constellation, zodiac)" });

    // 🧠 模式分級邏輯
    let mode = "basic";
    if (gender && zodiac && constellation) mode = "personality";
    if (bureau && ming_lord && shen_lord) mode = "ziwei";

    // 🪶 動態生成 Prompt
    const prompt = `
你是一位結合心理學與紫微斗數的個性顧問，請根據以下資料撰寫一段個人化「生日書開卡摘要」：
---
姓名：${name}
性別：${gender || "未指定"}
生肖：${zodiac}
星座：${constellation}
血型：${blood_type || "未填"}
五行局：${bureau || "未知"}
命主星：${ming_lord || "無"}
身主星：${shen_lord || "無"}
命宮主星：${Array.isArray(ming_stars) ? ming_stars.join("、") : ming_stars}
---

請以繁體中文撰寫，字數約 120～160 字。
語氣要溫暖、自然、有洞察力，不要用生硬的比喻（例如「像一條蛇」）。
請整合這些資訊，描述此人的思維模式、人際特質與生命能量。
最後用一句「總結句」收尾，展現他的核心天賦或生命方向。
`;

    // 🌟 模型設定
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      max_tokens: 220,
      messages: [
        {
          role: "system",
          content:
            "你是一位結合心理學與紫微斗數的顧問，擅長用溫暖、具深度與啟發性的語氣撰寫人生洞察摘要。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || "";

    return res.json({
      ok: true,
      mode,
      summary,
    });
  } catch (e) {
    console.error("ai.js error:", e);
    return res.status(500).json({ error: "AI 生成失敗" });
  }
}