// /pages/api/ai.js — v2.0.1（第二人稱優化 + 自然分段版）
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

    // 🧩 AI Prompt 模板（v2.0.1）
    const prompt = `
你是一位融合紫微斗數與心理學的人格顧問，請根據以下資料撰寫一段約 180～200 字的個性分析：
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
2️⃣ 避免直白提及星座或生肖名稱（例如不要說「你是牡羊座」）。
3️⃣ 以溫暖、正面、誠實的語氣撰寫，不誇張、不命理化。
4️⃣ 分為四個段落，並加入小標題：
   - 性格特質：
   - 潛能與優點：
   - 需要注意的地方：
   - 鼓勵與建議：
5️⃣ 每段中間請插入一個空行（\\n\\n）。
---

請以繁體中文完成。`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content:
            "你是一位融合紫微斗數與人格心理學的顧問，擅長以溫暖、真誠、富洞察力的語氣撰寫分析報告。",
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
