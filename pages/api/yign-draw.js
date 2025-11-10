/*****************************************************
 * 易光年・占卜引擎 API v3.4 (整合 iching.js + TXLOG)
 * ---------------------------------------------------
 * 1️⃣ 公正隨機取卦（Mickey 常數擾動）
 * 2️⃣ 人格導向 AI 解卦（星座＋血型）
 * 3️⃣ TXLOG 寫入：card:<UID14>:txlog（保留 10 筆）
 * ---------------------------------------------------
 * Data: /data/iching.js
 * Ver: 2025.11.10
 *****************************************************/

import OpenAI from "openai";
import { redis } from "../../lib/redis";
import { lookupIChing } from "../../data/iching";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TZ = "Asia/Taipei";

export default async function handler(req, res) {
  try {
    const { token, question } = req.query;

    if (!token || !question)
      return res.status(400).json({ error: "缺少必要參數 token 或 question" });

    // ------------------------------
    // 解碼 Token (Base64)
    // ------------------------------
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const parts = decoded.split(":");
    if (parts.length < 3)
      return res.status(400).json({ error: "Token 格式錯誤" });

    const [uid, ts, rand] = parts;
    if (!uid || !ts || !rand)
      return res.status(400).json({ error: "Token 內容不完整" });

    // ------------------------------
    // 取卦
    // ------------------------------
    const { guaIndex, yaoIndex } = deriveGuaYao(ts, rand);
    const guaData = lookupIChing(guaIndex, yaoIndex);
    if (!guaData) {
      console.warn(`[yign-draw] 卦象資料缺失: ${guaIndex}-${yaoIndex}`);
      return res.status(500).json({ error: "卦象資料缺失" });
    }

    // ------------------------------
    // 取卡片資料
    // ------------------------------
    const cardKey = `card:${uid}`;
    const card = await redis.hgetall(cardKey);
    const profileDesc = makeProfileDesc(card);
    const pointsBefore = card?.points ? Number(card.points) : null;

    // ------------------------------
    // AI 解卦
    // ------------------------------
    const aiText = await callOpenAI(composePrompt(question, guaData, profileDesc));

    // ------------------------------
    // 寫入 TXLOG（card:<UID>:txlog）
    // ------------------------------
    const logKey = `card:${uid}:txlog`;
    const nowStr = new Date().toLocaleString("zh-TW", { timeZone: TZ });
    const txRecord = JSON.stringify({
      type: "yign",
      service: "易光年占卜",
      ts,
      rand,
      gua: guaData.name,
      yao: guaData.yao,
      q: question,
      date: nowStr,
      points_before: pointsBefore,
      points_after: pointsBefore, // 此API不動點數
      ai_used: true,
    });
    await redis.lpush(logKey, txRecord);
    await redis.ltrim(logKey, 0, 9); // 僅保留最近 10 筆

    // ------------------------------
    // 回傳結果
    // ------------------------------
    return res.status(200).json({
      ok: true,
      gua: guaData,
      result: aiText,
      profile: profileDesc,
    });
  } catch (err) {
    console.error("[yign-draw.js] Error:", err);
    res.status(500).json({ error: "系統錯誤：" + err.message });
  }
}

// ------------------------------------------
// 卦象生成（公正隨機 + Mickey 擾動）
// ------------------------------------------
function deriveGuaYao(tsHex, randHex, date = new Date()) {
  const tsVal = parseInt(tsHex, 16) >>> 0;
  const rVal = parseInt(randHex, 16) >>> 0;
  const tSeed =
    ((date.getHours() << 12) | (date.getMinutes() << 6) | date.getSeconds()) >>> 0;

  let mix = (tsVal ^ rVal ^ tSeed) >>> 0;
  mix = Math.imul(mix ^ (mix >>> 13), 0x9e3779b1) >>> 0;
  mix = (mix ^ (mix >>> 16)) >>> 0;

  const guaIndex = mix % 64;
  const yaoIndex = ((mix >>> 6) % 6) >>> 0;

  if (guaIndex < 0 || guaIndex >= 64 || yaoIndex < 0 || yaoIndex >= 6) {
    console.warn(`[deriveGuaYao] Invalid index: ${guaIndex}, ${yaoIndex}`);
    return { guaIndex: 0, yaoIndex: 0, seed: mix };
  }
  return { guaIndex, yaoIndex, seed: mix };
}

// ------------------------------------------
// 個性描述生成
// ------------------------------------------
function makeProfileDesc(card) {
  if (!card || Object.keys(card).length === 0) return "未設定個人資料";
  const desc = [];
  if (card.constellation) desc.push(`星座：${card.constellation}`);
  if (card.blood_type) desc.push(`血型：${card.blood_type}`);
  if (card.gender) desc.push(`性別：${card.gender}`);
  return desc.length ? desc.join("，") : "未設定個人資料";
}

// ------------------------------------------
// AI Prompt 組合
// ------------------------------------------
function composePrompt(question, gua, profileDesc) {
  return `你是一位精通易經的AI占卜師，請用生活化語言，分兩段回答：
使用者的問題：「${question}」
卦象：第${gua.g}卦 ${gua.name}
卦辭：「${gua.guaci}」
動爻：${gua.yao}
爻辭：「${gua.yaoci}」
使用者人格：${profileDesc}

請分兩段回答：
1. 卦象對目前狀況的啟示（具體意涵）
2. 預測未來走向並根據使用者個性，給出行動與心理上的建議。

每段之間以兩個換行符號（\\n\\n）分隔。
`;
}

// ------------------------------------------
// OpenAI 呼叫
// ------------------------------------------
async function callOpenAI(prompt) {
  const chat = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
  });
  return chat.choices[0].message.content.trim();
}