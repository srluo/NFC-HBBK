// /pages/api/ai.js — v1.9.4（紫微融合 + 自動分段入庫）
import OpenAI from "openai";
import { redis } from "../../lib/redis";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchZiweiData(birthday, hourLabel) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ziwei-core`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ymd: birthday, hourLabel }),
    });
    if (!res.ok) return {};
    return await res.json();
  } catch (err) {
    console.error("fetchZiweiData error:", err);
    return {};
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    const {
      uid,
      name,
      gender,
      zodiac,
      constellation,
      blood_type,
      bureau,
      ming_lord,
      shen_lord,
      ming_stars,
      birthday,
      birth_time,
    } = req.body || {};

    if (!name || !constellation || !zodiac)
      return res.status(400).json({ error: "缺少必要參數 (name, constellation, zodiac)" });

    // 若缺紫微資料則補查
    let ziwei = {};
    if ((!bureau || !ming_lord) && birth_time) {
      ziwei = await fetchZiweiData(birthday, birth_time + "時");
    }

    const bureauFinal = bureau || ziwei.bureau || "未知";
    const mingLordFinal = ming_lord || ziwei.ming_lord || "未知";
    const shenLordFinal = shen_lord || ziwei.shen_lord || "未知";
    const mingStarsFinal =
      Array.isArray(ming_stars) && ming_stars.length > 0
        ? ming_stars
        : ziwei.ming_stars || [];

    // 🧩 Prompt 模板
    const prompt = `
你是一位結合紫微斗數與心理學的「人格顧問」。
請根據以下資料撰寫一段約 200～250 字的「完整個性總結」。
請務必輸出四個段落，每段之間請插入一個空行（\\n\\n）。
不要在文字中直接出現星座或生肖名稱，可內化其象徵特質。
---
姓名：${name}
性別：${gender || "未指定"}
生肖：${zodiac}
星座：${constellation}
血型：${blood_type || "未填"}
五行局：${bureauFinal}
命主星：${mingLordFinal}
身主星：${shenLordFinal}
命宮主星群：${Array.isArray(mingStarsFinal) ? mingStarsFinal.join("、") : mingStarsFinal || "無"}
---
結構要求：
① 整體性格與能量傾向  
② 可發揮的潛能與優點  
③ 應注意的性格盲點與挑戰  
④ 以一句鼓勵語收尾  
請用繁體中文，語氣自然、誠懇且具洞察力，採第二人稱「你」敘述。
`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "你是一位融合紫微斗數與人格心理學的顧問，擅長以溫暖、真誠、具洞察力的語氣撰寫個人化分析摘要。",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 512,
    });

    const fullText = completion.choices?.[0]?.message?.content?.trim() || "";

    // ✨ 自動分段
    const paragraphs = fullText.split(/\n{2,}|(?<=。)\s*/g).map((t) => t.trim()).filter(Boolean);

    // 🧠 若提供了 UID，直接寫入 Redis
    if (uid) {
      const key = `card:${uid}`;
      await redis.hset(key, {
        ai_summary: fullText,
        ai_summary_paragraphs: JSON.stringify(paragraphs),
      });
    }

    return res.json({ ok: true, summary: fullText, paragraphs });
  } catch (e) {
    console.error("ai.js error:", e);
    return res.status(500).json({ error: "AI 生成失敗" });
  }
}
