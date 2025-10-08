// /lib/ai.js
import OpenAI from "openai";

// 🔹 檢查是否有設定 OPENAI_API_KEY
const HAS_KEY = !!process.env.OPENAI_API_KEY;

// 🔹 初始化（若沒 key，就不建立實體 client）
let openai = null;
if (HAS_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log("[AI] OpenAI client 已初始化");
} else {
  console.warn("[AI] 未設定 OPENAI_API_KEY，啟用模擬模式");
}

/**
 * 產生 AI 個性摘要
 * @param {Object} info - { user_name, birthday, constellation, zodiac, blood_type, birth_time }
 * @returns {Promise<string>}
 */
export async function generateAISummary(info) {
  const { user_name, birthday, constellation, zodiac, blood_type, birth_time } = info;

  // ✅ 模擬模式（本地 / 測試時）
  if (!HAS_KEY) {
    const mock = `你是個在 ${constellation} 影響下充滿熱情的靈魂，擁有屬於「${zodiac}」的冷靜與堅韌，${blood_type} 型的你待人誠懇、真實。`;
    return Promise.resolve(mock);
  }

  // ✅ OpenAI 實際生成
  try {
    const prompt = `
你是一位溫暖的性格分析專家，請根據以下資訊生成約 60 字的「個性摘要」：
- 姓名：${user_name || "使用者"}
- 生日：${birthday}
- 星座：${constellation}
- 生肖：${zodiac}
- 血型：${blood_type}
- 出生時辰：${birth_time}

語氣溫柔、自然、貼近生活，不要太像命理分析，要像朋友給的鼓勵。
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.85,
    });

    const text = completion.choices[0].message.content.trim();
    return text;
  } catch (e) {
    console.error("[AI] 生成個性摘要失敗:", e);
    return "你擁有堅定與溫暖的靈魂，能以真誠的方式影響他人。";
  }
}