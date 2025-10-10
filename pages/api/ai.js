// /pages/api/ai.js — v1.7.6C（可診斷錯誤＋雙段式）
import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

    // 1) 確認後端 key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ ok: false, error: "OPENAI_API_KEY 缺失" });
    }
    const client = new OpenAI({ apiKey });

    // 2) 取參數
    const {
      name, gender, zodiac, constellation,
      bureau, ming_lord, shen_lord, ming_stars, blood_type,
    } = req.body || {};

    if (!name || !constellation || !zodiac || !ming_lord) {
      return res.status(400).json({ ok: false, error: "缺少必要參數 (name, constellation, zodiac, ming_lord)" });
    }

    // 3) Prompt（雙段式＋避免生硬比喻）
    const prompt = `
你是一位結合心理學與紫微斗數的生命教練，請生成「生日書個性摘要」，分為兩段：
第一段：描述其內在特質與能量（整體印象、互動感受）。
第二段：給予鼓勵與方向（如何善用特質，1句行動建議）。

---
姓名：${name}
性別：${gender || "未指定"}
生肖：${zodiac}
星座：${constellation}
血型：${blood_type || "未填"}
五行局：${bureau || "未知"}
命主星：${ming_lord}
身主星：${shen_lord}
命宮主星：${Array.isArray(ming_stars) ? ming_stars.join("、") : (ming_stars || "")}
---

限制：
- 繁體中文，120～160字。
- 避免「像一條…」「你是…的人」等直白比喻。
- 兩段中間請插入一個空行（\\n\\n）。
`.trim();

    // 4) 20秒超時保護（server 端）
    const aiCall = client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "你以溫暖、真誠、具洞察的口吻，整合心理學與紫微概念撰寫個人摘要。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 250,
    });

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI_TIMEOUT_20S")), 20000)
    );

    const completion = await Promise.race([aiCall, timeout]);
    const summary = completion?.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return res.status(502).json({ ok: false, error: "LLM 無回應或空內容" });
    }

    return res.json({ ok: true, summary });
  } catch (e) {
    // 5) 回傳可診斷訊息（方便你在 Network/Logs 直接看到原因）
    const detail =
      e?.response?.data?.error?.message ||
      e?.message ||
      "unknown";
    console.error("ai.js error detail:", detail);
    return res.status(500).json({ ok: false, error: "AI 生成失敗", detail });
  }
}
