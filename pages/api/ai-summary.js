// ------------------------------------------------------------
// /pages/api/ai-summary.js — v1.9.5-final
// ✅ 支援新版 fortuneCore 結構（ziweis JSON）
// ✅ 自動補強檢查，避免「注意事項與建議」被截斷
// ✅ 維持 Roger 標準語氣與格式要求
// ------------------------------------------------------------

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
      ziweis = {},
    } = req.body || {};

    // 兼容 v2.6.4 結構：若傳入 ziweis JSON 則覆蓋原參數
    const bureauVal = ziweis?.bureau || bureau || "未知";
    const mingLord = ziweis?.ming_lord || ming_lord || "未知";
    const shenLord = ziweis?.shen_lord || shen_lord || "未知";
    const starsVal = Array.isArray(ziweis?.ming_stars)
      ? ziweis.ming_stars
      : ming_stars || [];

    if (!constellation || !zodiac)
      return res.status(400).json({ error: "缺少必要參數" });

    // ------------------------------------------------------------
    // 🧠 Prompt 建構
    // ------------------------------------------------------------
    const prompt = `
你是一位人格心理顧問，根據以下資料撰寫一段約 150 字的「個性摘要」：
---
性別：${gender || "未指定"}
生肖：${zodiac}
星座：${constellation}
血型：${blood_type || "未填"}
五行局：${bureauVal}
命主星：${mingLord}
身主星：${shenLord}
命宮主星群：${Array.isArray(starsVal) ? starsVal.join("、") : starsVal}
---
撰寫要求：
1️⃣ 禁止出現任何人名（如 ${name}）。  
2️⃣ 禁止使用第三人稱（如「他」「她」），一律用「你」開頭敘述。  
3️⃣ 不得重複提及星座或生肖名稱。  
4️⃣ 以溫暖、自然、具洞察力的語氣撰寫。  
5️⃣ 全文分為三段，每段開頭請加上標題：  
   - 性格特質：  
   - 潛能優點：  
   - 注意事項與建議：  
6️⃣ 每段之間以兩個換行符號（\\n\\n）分隔。  
7️⃣ 全文長度控制在 130～160 字之間。
請務必完整輸出三段並於結尾加上「END-OF-SUMMARY」字樣。
`;

    // ------------------------------------------------------------
    // ✨ 生成主體
    // ------------------------------------------------------------
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位融合心理學與紫微觀察的顧問，擅長以第二人稱撰寫自然、誠懇、結構分明的個性摘要。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 600,
    });

    let summary = completion.choices?.[0]?.message?.content?.trim() || "";

    // ------------------------------------------------------------
    // 🩹 截斷檢查與補救機制
    // ------------------------------------------------------------
    const hasAllThree =
      summary.includes("性格特質") &&
      summary.includes("潛能優點") &&
      summary.includes("注意事項與建議");

    const hasEndMark = summary.includes("END-OF-SUMMARY");

    if (!hasAllThree || !hasEndMark) {
      console.warn("⚠️ 檢測到內容不完整，重新嘗試生成一次...");
      const retry = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "你是一位人格心理顧問，請重新生成完整的三段式摘要（性格特質／潛能優點／注意事項與建議）。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 650,
      });
      summary = retry.choices?.[0]?.message?.content?.trim() || summary;
    }

    // 移除 END 標記（不顯示給使用者）
    summary = summary.replace(/END-OF-SUMMARY/g, "").trim();

    return res.json({ ok: true, summary });
  } catch (e) {
    console.error("ai-summary error:", e);
    return res.status(500).json({ error: "AI 生成失敗" });
  }
}