// ------------------------------------------------------------
// /pages/api/card-activate.js — v2.6.4-final
// ✅ 四柱與紫微改為 JSON 儲存格式
// ✅ 一次性獎勵邏輯（首次完整開卡或首次補填）
// ✅ 整合 fortuneCore (農曆 + 四柱 + 紫微)
// ✅ AI Summary 自動生成
// ✅ Redis 一次寫入，防止 undefined
// ------------------------------------------------------------

import { redis } from "../../lib/redis.js";
import { fortuneCore } from "../../lib/fortuneCore.js";
import { getLuckyNumber } from "../../lib/luckyNumber.js";

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

    // ------------------------------------------------------------
    // 🧩 Token → UID
    // ------------------------------------------------------------
    const [uid] = Buffer.from(token, "base64").toString().split(":");
    if (!uid) return res.status(400).json({ error: "Token 解析錯誤" });

    // ------------------------------------------------------------
    // 🌕 Step 1. 命理核心：fortuneCore()
    // ------------------------------------------------------------
    const { ok, lunar, pillars, ziwei, error } = await fortuneCore(
      birthday,
      birth_time,
      gender
    );

    if (!ok) console.warn("⚠️ fortuneCore 錯誤:", error);
    else {
      console.log("🌕 農曆:", lunar);
      console.log("🪐 四柱:", pillars);
      console.log("🔮 紫微命盤:", ziwei);
    }

    // ------------------------------------------------------------
    // 🎯 Step 2. 幸運數字
    // ------------------------------------------------------------
    const { lucky_number, lucky_desc } = getLuckyNumber(String(birthday));

    // ------------------------------------------------------------
    // 🗄️ Step 3. 讀取 Redis 舊資料
    // ------------------------------------------------------------
    const cardKey = `card:${uid}`;
    const existing = (await redis.hgetall(cardKey)) || {};
    const first_time = !existing.status || existing.status !== "ACTIVE";
    let points = Number(existing.points || 0);

    // ------------------------------------------------------------
    // 💎 Step 4. 一次性獎勵邏輯
    // ------------------------------------------------------------
    if (first_time) {
      if (gender && birth_time) {
        points += 20;
        console.log(`🎁 ${uid} 首次開卡資料完整，贈送 20 點`);
      } else {
        console.log(`ℹ️ ${uid} 首次開卡資料不完整，暫不贈點`);
      }
    } else if (
      gender &&
      birth_time &&
      (!existing.gender || !existing.birth_time) &&
      Number(existing.points || 0) < 20
    ) {
      points += 20;
      console.log(`🎁 ${uid} 完成補填，獲得一次性 20 點獎勵`);
    } else {
      console.log(`ℹ️ ${uid} 無加點條件（重複修改或已領過獎勵）`);
    }

    // ------------------------------------------------------------
    // 🤖 Step 5. AI 個性摘要（v1.9.4 Stable）
    // ------------------------------------------------------------
    let ai_summary = "";
    try {
      const aiRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ai-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user_name,
          gender,
          zodiac: lunar?.zodiac || "",
          constellation: lunar?.constellation || "",
          blood_type,
          bureau: ziwei?.bureau || "",
          ming_lord: ziwei?.ming_lord || "",
          shen_lord: ziwei?.shen_lord || "",
          ming_stars: ziwei?.ming_main_stars || [],
        }),
      });
      const aiData = await aiRes.json();
      if (aiRes.ok && aiData.summary) ai_summary = aiData.summary;
      else console.warn("⚠️ AI 摘要生成失敗:", aiData.error);
    } catch (err) {
      console.error("AI 生成錯誤:", err);
    }

    // ------------------------------------------------------------
    // 🧭 Step 6. 組合卡片資料（JSON 結構化）
    // ------------------------------------------------------------
    const four_pillars = {
      year: pillars?.year || "",
      month: pillars?.month || "",
      day: pillars?.day || "",
      hour: pillars?.hour || "",
      jieqi_month: pillars?.jieqi_month || "",
    };

    const ziweis = {
      yyear_ganzhi: ziwei?.year_ganzhi || lunar?.year_ganzhi || "",
      bureau: ziwei?.bureau || "",
      ming_branch: ziwei?.ming_branch || "",
      shen_branch: ziwei?.shen_branch || "",
      ming_lord: ziwei?.ming_lord || "",
      shen_lord: ziwei?.shen_lord || "",
      ming_stars: ziwei?.ming_main_stars || [],
    };

    const cardData = {
      uid,
      user_name,
      gender: gender || "",
      birth_time: birth_time || "",
      blood_type: blood_type || "",
      hobbies: hobbies || "",
      birthday,
      lunar_birthday: lunar?.lunar_birthday || "",
      zodiac: lunar?.zodiac || "",
      constellation: lunar?.constellation || "",
      four_pillars: JSON.stringify(four_pillars),
      ziweis: JSON.stringify(ziweis),
      lucky_number,
      lucky_desc,
      ai_summary,
      status: "ACTIVE",
      points,
      opened: true,
      last_seen: new Date().toLocaleString("zh-TW", { hour12: false }),
      updated_at: Date.now(),
    };

    // ------------------------------------------------------------
    // 💾 Step 7. Redis 寫入
    // ------------------------------------------------------------
    try {
      await redis.hset(cardKey, cardData);
    } catch (err) {
      console.error("❌ Redis 寫入錯誤:", err.message);
    }

    console.log(`🎉 開卡成功: ${user_name} ${lunar?.zodiac} ${lunar?.constellation}`);
    return res.json({ ok: true, first_time, card: cardData });
  } catch (err) {
    console.error("❌ card-activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}