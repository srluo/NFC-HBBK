// ------------------------------------------------------------
// /pages/api/card-activate.js — v2.6.5-stable
// ✅ 自動建立 pins:{} 結構
// ✅ 保留原有邏輯完全不變
// ------------------------------------------------------------
import { redis } from "../../lib/redis.js";
import { fortuneCore } from "../../lib/fortuneCore.js";
import { getLuckyNumber } from "../../lib/luckyNumber.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { token, user_name, gender, blood_type, hobbies, birth_time, birthday } =
      req.body || {};
    if (!token || !user_name || !birthday)
      return res.status(400).json({ error: "缺少必要參數" });

    // 🧩 Token → UID
    const [uid] = Buffer.from(token, "base64").toString().split(":");
    if (!uid) return res.status(400).json({ error: "Token 解析錯誤" });

    // 🌕 命理核心
    const { ok, lunar, pillars, ziwei, error } = await fortuneCore(
      birthday,
      birth_time,
      gender
    );

    if (!ok) console.warn("⚠️ fortuneCore 錯誤:", error);

    // 🎯 幸運數字
    const { lucky_number, lucky_desc } = getLuckyNumber(String(birthday));

    // 🗄️ 讀取舊資料
    const cardKey = `card:${uid}`;
    const existing = (await redis.hgetall(cardKey)) || {};
    const first_time = !existing.status || existing.status !== "ACTIVE";
    let points = Number(existing.points || 0);

    // 💎 一次性獎勵邏輯
    if (first_time) {
      if (gender && birth_time) {
        points += 20;
        console.log(`🎁 ${uid} 首次開卡資料完整，贈送 20 點`);
      }
    } else if (
      gender &&
      birth_time &&
      (!existing.gender || !existing.birth_time) &&
      Number(existing.points || 0) < 20
    ) {
      points += 20;
      console.log(`🎁 ${uid} 補填完整資料，贈送 20 點`);
    }

    // 🤖 AI 個性摘要
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
    } catch (err) {
      console.error("AI 生成錯誤:", err);
    }

    // 🧭 組合資料
    const four_pillars = {
      year: pillars?.year || "",
      month: pillars?.month || "",
      day: pillars?.day || "",
      hour: pillars?.hour || "",
      jieqi_month: pillars?.jieqi_month || "",
    };

    const ziweis = {
      year_ganzhi: ziwei?.year_ganzhi || lunar?.year_ganzhi || "",
      bureau: ziwei?.bureau || "",
      ming_branch: ziwei?.ming_branch || "",
      shen_branch: ziwei?.shen_branch || "",
      ming_lord: ziwei?.ming_lord || "",
      shen_lord: ziwei?.shen_lord || "",
      ming_stars: ziwei?.ming_main_stars || [],
    };

    // 🆕 新增 pins 結構
    const now = new Date().toISOString();
    const pins = JSON.stringify({
      enabled: false,
      attempts: 0,
      locked_until: 0,
      updated_at: now,
    });

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
      pins, // ✅ 新增欄位
      last_seen: new Date().toLocaleString("zh-TW", { hour12: false }),
      updated_at: Date.now(),
    };

    // 💾 Redis 寫入
    await redis.hset(cardKey, cardData);

    console.log(`🎉 開卡成功: ${user_name} ${lunar?.zodiac} ${lunar?.constellation}`);
    return res.json({ ok: true, first_time, card: cardData });
  } catch (err) {
    console.error("❌ card-activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}