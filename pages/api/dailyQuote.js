// /api/dailyQuote.js
import OpenAI from "openai";

const HAS_KEY = !!process.env.OPENAI_API_KEY;
let openai = null;

if (HAS_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  console.log("[AI] OpenAI client 可用於 dailyQuote");
} else {
  console.warn("[AI] 未設定 OPENAI_API_KEY，dailyQuote 將使用 seed 模式");
}

/**
 * 根據 seed（星座 + 生肖）與日期生成穩定隨機建議
 */
function seedQuote(seed) {
  const base = `${seed}-${new Date().toISOString().slice(0, 10)}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = base.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const quotes = [
    "保持微笑，今天的你比想像中更有力量。",
    "別急著往前，靜下心就能看到方向。",
    "今天是行動的好日子，別再等待靈感了。",
    "花一點時間傾聽自己的聲音，它會給你答案。",
    "你的直覺正帶你走向正確的地方。",
    "別害怕改變，它只是成長的另一種形式。",
    "試著感謝眼前的一切，世界會變得更溫柔。",
    "用心對待每件小事，好運會悄悄靠近。",
    "放慢腳步，別忘了欣賞沿途的風景。",
    "堅持下去，宇宙正在為你排隊準備驚喜。",
  ];
  const index = Math.abs(hash) % quotes.length;
  return quotes[index];
}

/**
 * AI 模式（若 key 存在）
 */
async function aiQuote(seed) {
  try {
    const prompt = `
你是一位情緒教練，根據使用者的星座與生肖特質，
給出一句正向、具行動力的每日建議。
請用繁體中文回答，不超過 25 字。

使用者資訊：
${seed}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    return completion.choices[0].message.content.trim();
  } catch (e) {
    console.error("[AI] dailyQuote 生成失敗:", e);
    return seedQuote(seed); // fallback
  }
}

export default async function handler(req, res) {
  try {
    const seed = decodeURIComponent(req.query.seed || "default");
    let quote;

    // ✅ 若有 key，則可升級為 AI 模式（未來可加扣點）
    if (HAS_KEY) {
      quote = await aiQuote(seed);
    } else {
      quote = seedQuote(seed);
    }

    res.json({ ok: true, quote, seed });
  } catch (err) {
    console.error("dailyQuote fatal error:", err);
    res.status(500).json({ ok: false, error: "伺服器錯誤" });
  }
}