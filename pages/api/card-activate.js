// /pages/api/card-activate.js — v2.0.0（同步等待 AI + Redis 寫入完成版）
// ------------------------------------------------------------
// ✅ 特點：
// 1️⃣ AI 生成後才回傳成功，避免 first.jsx reload 多次。
// 2️⃣ 幸運數字、紫微命格一併寫入。
// 3️⃣ 確保 Redis 資料完整（ai_summary 一次到位）。
// ------------------------------------------------------------

import { redis } from "../../lib/redis";
import { calcZodiac } from "../../lib/zodiac";
import { getLuckyNumber } from "../../lib/luckyNumber";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const {
      token,
      user_name,
      gender,
      blood_type,
      hobbies,
      birth_time,
      birthday,
    } = req.body || {};

    if (!token || !user_name || !birthday)
      return res.status(400).json({ error: "缺少必要參數" });

    // 🧩 解析 Token 取 UID
    const [uid] = Buffer.from(token, "base64").toString().split(":");
    if (!uid) return res.status(400).json({ error: "Token 解析錯誤" });

    const { lunarDate, zodiac, constellation } = calcZodiac(birthday);
    const key = `card:${uid}`;
    const existing = (await redis.hgetall(key)) || {};

    const first_time = !existing.status || existing.status !== "ACTIVE";
    let points = Number(existing.points || 0);
    if (first_time) points += 20;

    // 🎯 幸運數字計算
    const { number, masterNumber } = getLuckyNumber(birthday);
    const lucky_number = masterNumber
      ? `${masterNumber}（大師數字）`
      : String(number);
    const lucky_desc =
      masterNumber === 11
        ? "擁有強烈直覺與靈性洞察力。"
        : masterNumber === 22
        ? "天生的實踐者，能將理想化為現實。"
        : masterNumber === 33
        ? "具備療癒與啟發能量，象徵無私與人道精神。"
        : {
            1: "象徵領導與創造，勇於開拓新局。",
            2: "代表協調與感應，擅長人際互動。",
            3: "充滿靈感與表達力，帶來歡樂與創意。",
            4: "實事求是，重視穩定與秩序。",
            5: "熱愛自由，勇於探索新體驗。",
            6: "充滿愛心與責任感，重視家庭與人際關係。",
            7: "思考深入，追求真理與智慧。",
            8: "擁有強大行動力與影響力。",
            9: "富有同理與包容，渴望助人與理想。",
          }[number] || "";

    // ✅ 基礎卡資料
    const card = {
      uid,
      status: "ACTIVE",
      user_name,
      gender: gender || "",
      blood_type: blood_type || "",
      hobbies: hobbies || "",
      birth_time: birth_time || "",
      birthday,
      lunar_birthday: lunarDate,
      zodiac,
      constellation,
      lucky_number,
      lucky_desc,
      points: points.toString(),
      last_seen: new Date().toISOString(),
      updated_at: Date.now().toString(),
    };

    // ✅ 紫微分析：性別 + 出生時辰都有填才查
    let ziweiData = {};
    if (gender && birth_time) {
      try {
        const ziweiRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ziwei-core`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ birthday, gender, birth_time }),
        });
        const ziweiJson = await ziweiRes.json();
        if (ziweiRes.ok && !ziweiJson.error) {
          ziweiData = ziweiJson;
        }
      } catch (err) {
        console.warn("⚠️ 紫微分析失敗:", err);
      }
    }

    // ✅ 生成 AI 摘要（等待完成再回傳）
    let ai_summary = "";
    try {
      const aiRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user_name,
          gender,
          zodiac,
          constellation,
          blood_type,
          bureau: ziweiData.bureau || "",
          ming_lord: ziweiData.ming_lord || "",
          shen_lord: ziweiData.shen_lord || "",
          ming_stars: ziweiData.ming_stars || [],
        }),
      });

      const aiData = await aiRes.json();
      if (aiRes.ok && aiData.summary) {
        ai_summary = aiData.summary;
      } else {
        console.warn("⚠️ AI 摘要生成失敗:", aiData.error);
      }
    } catch (err) {
      console.error("AI 生成錯誤:", err);
    }

    // ✅ 寫入 Redis
    const finalCard = { ...card, ...ziweiData, ai_summary };
    await redis.hset(key, finalCard);

    return res.json({ ok: true, first_time, card: finalCard });
  } catch (err) {
    console.error("card-activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
