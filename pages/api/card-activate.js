// /pages/api/card-activate.js — v2.7.5-minimalSub
// ✅ 補填送點後不再建立 daily=false 結構
// ✅ 若無訂閱資料則保持空值（undefined）
// ✅ 保留 birthday lock + AI + points 流程一致

import { redis } from "../../lib/redis.js";
import { fortuneCore } from "../../lib/fortuneCore.js";
import { getLuckyNumber } from "../../lib/luckyNumber.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { token, user_name, gender, blood_type, hobbies, birth_time, birthday } =
      req.body || {};
    if (!token || !user_name)
      return res.status(400).json({ error: "缺少必要參數" });

    const [uid] = Buffer.from(token, "base64").toString().split(":");
    if (!uid) return res.status(400).json({ error: "Token 解析錯誤" });

    const cardKey = `card:${uid}`;
    const existing = (await redis.hgetall(cardKey)) || {};

    // 🔒 生日鎖定
    const existingBirthday = existing.birthday || "00000000";
    const existingStatus = existing.status || "PENDING";
    const isAlreadyBound = existingBirthday !== "00000000";
    const isActive = existingStatus === "ACTIVE";

    if ((isAlreadyBound || isActive) && birthday && birthday !== existingBirthday)
      return res.status(400).json({ error: "生日已綁定，無法修改" });

    if (!isAlreadyBound && (!birthday || birthday === "00000000"))
      return res.status(400).json({ error: "Capsule 卡必須輸入生日" });

    const finalBirthday = isAlreadyBound ? existingBirthday : birthday;

    // 🌕 命理與幸運數字
    const { ok, lunar, pillars, ziwei } = await fortuneCore(finalBirthday, birth_time, gender);
    const { lucky_number, lucky_desc } = getLuckyNumber(String(finalBirthday));

    // 💎 點數邏輯
    const first_time = !existing.status || existing.status !== "ACTIVE";
    let points = Number(existing.points || 0);
    if (first_time && gender && birth_time) points += 20;
    else if (
      gender && birth_time &&
      (!existing.gender || !existing.birth_time) &&
      Number(existing.points || 0) < 20
    ) points += 20;

    // 🤖 AI 摘要
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
    } catch {}

    const now = new Date();
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

    // 🔐 pins
    const pins = JSON.stringify({
      enabled: false,
      attempts: 0,
      locked_until: 0,
      updated_at: now.toISOString(),
    });

    // 🗃 subscriptions — 僅保留既有，不建立空 daily
    let subscriptions = existing.subscriptions || "";

    const cardData = {
      uid,
      user_name,
      gender: gender || "",
      birth_time: birth_time || "",
      blood_type: blood_type || "",
      hobbies: hobbies || "",
      birthday: finalBirthday,
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
      pins,
      subscriptions, // 🚫 不建立空 daily
      last_seen: new Date().toLocaleString("zh-TW", { hour12: false }),
      updated_at: Date.now(),
    };

    await redis.hset(cardKey, cardData);
    console.log(`🎉 開卡成功: ${user_name} (${uid}) ${lunar?.zodiac} ${lunar?.constellation}`);

    return res.json({ ok: true, first_time, card: cardData });
  } catch (err) {
    console.error("❌ card-activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}