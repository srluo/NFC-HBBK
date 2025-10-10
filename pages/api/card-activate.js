// /pages/api/card-activate.js — v1.7.6「AI 安全版」
import { kv } from "@vercel/kv";
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const {
      token,
      user_name,
      gender,
      birthday,
      blood_type,
      hobbies,
      birth_time,
    } = req.body || {};

    if (!token || !birthday)
      return res.status(400).json({ error: "缺少必要參數 token 或生日" });

    const uid = token.split(":")[0];
    let card = await kv.hgetall(`card:${uid}`);

    // 🔸 第一次開卡
    const first_time = !card;

    // 建立預設資料
    card = {
      uid,
      user_name,
      gender,
      birthday,
      blood_type,
      hobbies,
      birth_time,
      points: first_time ? 20 : card.points || 0,
      updated_at: Date.now(),
      ai_summary: card?.ai_summary || "",
    };

    // 儲存初步資料
    await kv.hset(`card:${uid}`, card);

    // ✅ AI 生成摘要（若填入完整資料）
    if (user_name && (gender || birth_time)) {
      const aiPayload = {
        name: user_name,
        gender,
        zodiac: card.zodiac || "未知",
        constellation: card.constellation || "未知",
        bureau: card.bureau || "未知",
        ming_lord: card.ming_lord || "未知",
        shen_lord: card.shen_lord || "未知",
        ming_stars: card.ming_stars || [],
        blood_type,
      };

      const aiUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/ai`;

      // 🕐 fallback 機制（AI 超過 25 秒沒回應則自動使用暫代）
      const aiPromise = fetch(aiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiPayload),
      }).then((r) => r.json());

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              summary: "AI 系統繁忙，暫時無法生成個性摘要。稍後可重新生成。",
            }),
          25000 // 25 秒 fallback
        )
      );

      let aiData = await Promise.race([aiPromise, timeoutPromise]);

      if (aiData.ok && aiData.summary) {
        card.ai_summary = aiData.summary;
        await kv.hset(`card:${uid}`, card);
      } else {
        card.ai_summary = "AI 系統暫時無法生成摘要，請稍後再試。";
        await kv.hset(`card:${uid}`, card);
      }
    }

    return res.json({ ok: true, card, first_time });
  } catch (err) {
    console.error("❌ card-activate error:", err);
    return res.status(500).json({ error: "系統錯誤" });
  }
}
