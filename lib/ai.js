import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateAISummary({ user_name, birthday, constellation, zodiac, blood_type, birth_time }) {
  try {
    const prompt = `
你是一位性格分析專家。請根據以下資訊，生成一段約 60 字的個性摘要：
- 姓名：${user_name}
- 生日：${birthday}
- 星座：${constellation}
- 生肖：${zodiac}
- 血型：${blood_type}
- 出生時辰：${birth_time}

語氣溫暖、自然，像朋友給的建議。
`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });
    return completion.choices[0].message.content.trim();
  } catch (e) {
    console.error("AI Summary 生成失敗:", e);
    return "你擁有獨特的天賦與性格，值得好好發揮。";
  }
}
