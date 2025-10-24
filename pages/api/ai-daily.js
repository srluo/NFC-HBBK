// /pages/api/ai-daily.js — v3.6-final
// AI 行動建議生成引擎 v3.6-final
// 作者：Roger Luo｜NFCTOGO 研究出版
// 日期：2025.10.24
// ✅ 支援新版 ziweis 結構（v2.6.4）
// ✅ 舊版參數相容（ming_lord 仍可用）
// ✅ 保留 toneMatrix / subscriptions / Redis 緩存邏輯
// ------------------------------------------------------------

import { redis } from "../../lib/redis";
import OpenAI from "openai";
import { getToneProfile } from "../../lib/toneMatrix";
import {
  parseSubscriptions,
  isSubscriptionActive,
} from "../../lib/subscriptions";

// 🩸 血型語氣修正模組
const bloodTone = {
  A: "語氣應安撫，協助降低焦慮。",
  B: "語氣應引導，幫助集中行動。",
  O: "語氣應穩定，避免過度衝動。",
  AB: "語氣應平衡，鼓勵內外兼顧。",
};
function getBloodTone(type) {
  return bloodTone[type] || "語氣中性穩定。";
}

// 主題五大準則
const THEMES = [
  { key: "心境調整", desc: "引導使用者回到內在平衡狀態。" },
  { key: "行動啟發", desc: "激發行動與突破慣性。" },
  { key: "人際互動", desc: "提醒覺察與溝通細節。" },
  { key: "自我成長", desc: "反思、洞察、長期思維。" },
  { key: "放下與休息", desc: "引導放鬆與節奏意識。" },
];

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  try {
    const {
      uid,
      birthday,
      gender,
      constellation,
      blood_type,
      ming_lord,
      ziweis = {},
    } = req.body || {};

    // ✅ 新舊格式相容
    const mingLord = ziweis?.ming_lord || ming_lord || "未知";
    const bureau = ziweis?.bureau || "未定";

    if (!uid || !birthday || !gender || !constellation) {
      return res.status(400).json({ ok: false, message: "缺少必要參數" });
    }

    const key = `card:${uid}`;
    const card = await redis.hgetall(key);
    if (!card || !card.status)
      return res.status(404).json({ ok: false, message: "找不到卡片資料" });

    // ------------------------------------------------------------
    // 🧩 檢查訂閱狀態
    // ------------------------------------------------------------
    let subs = parseSubscriptions(card.subscriptions);
    const service = "daily";
    if (!isSubscriptionActive(subs, service)) {
      return res.json({
        ok: false,
        message: "尚未開通每日行動建議服務",
      });
    }

    // ------------------------------------------------------------
    // 📅 檢查 Redis 快取
    // ------------------------------------------------------------
    const today = new Date().toISOString().slice(0, 10);
    const redisKey = `ai-daily:${uid}:${today}`;
    const cached = await redis.get(redisKey);
    if (cached) return res.json({ fromCache: true, ...JSON.parse(cached) });

    // ------------------------------------------------------------
    // 🧮 年齡估算
    // ------------------------------------------------------------
    const birthYear = parseInt(String(birthday).slice(0, 4));
    const age = new Date().getFullYear() - birthYear;

    // ------------------------------------------------------------
    // 🎨 語氣設定
    // ------------------------------------------------------------
    const tone = getToneProfile(mingLord, gender);
    const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    const bloodToneHint = getBloodTone(blood_type);

    // ------------------------------------------------------------
    // 🧠 AI 提示詞
    // ------------------------------------------------------------
    const prompt = `
請根據以下人格條件生成一句「今日行動建議」：
- 年齡層：約 ${age} 歲
- 性別：${gender}
- 星座：${constellation}
- 命主星：${mingLord}
- 五行局：${bureau}
- 血型：${blood_type || "未知"}（${bloodToneHint}）
- 主題：${theme.key}（${theme.desc}）
- 語氣特徵：${tone.tone}
- 參考示例：${tone.sample}

規範：
1. 使用繁體中文，40～60 字。
2. 語氣自然、有溫度，帶有行動導向。
3. 不使用命令語氣，不重複示例內容。
4. 不出現「星座」「命理」「占卜」等字詞。
`;

    const aiRes = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: "你是一位溫暖且理性的生活導師。" },
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 120,
    });

    const suggestion = aiRes.choices?.[0]?.message?.content?.trim() || "";

    const result = {
      ok: true,
      suggestion:
        suggestion ||
        "今天適合放慢步調，穩住節奏，給自己喘息的空間。",
      theme: theme.key,
      tone: tone.tone,
    };

    // ------------------------------------------------------------
    // 🧠 寫入 Redis 快取（有效期：1 天）
    // ------------------------------------------------------------
    try {
      await redis.set(redisKey, JSON.stringify(result), "EX", 86400);
    } catch (e) {
      console.warn("⚠️ Redis 快取失敗:", e.message);
    }

    // ------------------------------------------------------------
    // 🎯 回傳結果
    // ------------------------------------------------------------
    return res.json(result);
  } catch (err) {
    console.error("AI 行動建議錯誤:", err);
    return res.status(500).json({ ok: false, message: "伺服器錯誤" });
  }
}