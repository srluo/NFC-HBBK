// /pages/api/card-activate.js — v1.8.0 智慧開卡封存版
import { redis } from "../../lib/redis";
import { calcZodiac } from "../../lib/zodiac";
import { getLuckyNumber } from "../../lib/luckyNumber";

function safeNowString() {
  const now = new Date();
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);
  } catch {
    return new Date(now.getTime() + 8 * 3600 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
  }
}

async function readCard(uid) {
  try {
    const card = await redis.hgetall(`card:${uid}`);
    return card && Object.keys(card).length > 0 ? card : null;
  } catch (err) {
    console.error("❌ Redis 讀取錯誤:", err);
    return null;
  }
}

async function writeCard(uid, data) {
  try {
    const flat = {};
    for (const [k, v] of Object.entries(data)) {
      flat[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
    await redis.hset(`card:${uid}`, flat);
  } catch (err) {
    console.error("❌ Redis 寫入錯誤:", err);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { token, user_name, gender, birthday, blood_type, hobbies, birth_time } = req.body || {};
    if (!token || !user_name || !birthday)
      return res.status(400).json({ error: "缺少必要參數" });

    const [uid] = Buffer.from(token, "base64").toString().split(":");
    if (!uid) return res.status(400).json({ error: "Token 解析錯誤" });

    const existing = await readCard(uid);
    const first_time = !existing;

    // 基本星座／生肖
    const { lunarDate, zodiac, constellation } = calcZodiac(birthday);

    // 若首次開卡 → 初始化完整資料
    let card = existing || {
      uid,
      user_name,
      gender: gender || "",
      birthday,
      lunar_birthday: lunarDate,
      blood_type: blood_type || "",
      hobbies: hobbies || "",
      birth_time: birth_time || "",
      zodiac,
      constellation,
      points: "20",
      status: "ACTIVE",
      created_at: safeNowString(),
    };

    // 生命靈數
    if (!card.lucky_number) {
      const { number, masterNumber } = getLuckyNumber(birthday);
      card.lucky_number = masterNumber ? `${masterNumber}（大師數字）` : number?.toString() || "";
    }

    // 若有時辰與性別 → 呼叫紫微核心
    if (birth_time && gender && !card.bureau) {
      try {
        const resZiwei = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ziwei-core`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ymd: birthday.replace(/-/g, ""), hourLabel: birth_time }),
        });
        const ziwei = await resZiwei.json();
        if (resZiwei.ok && ziwei.ming_branch) {
          Object.assign(card, {
            bureau: ziwei.bureau,
            ming_branch: ziwei.ming_branch,
            shen_branch: ziwei.shen_branch,
            ming_lord: ziwei.ming_lord,
            shen_lord: ziwei.shen_lord,
            ming_stars: ziwei.ming_stars,
          });
        }
      } catch (err) {
        console.warn("⚠️ 紫微運算失敗:", err);
      }
    }

    // 首次開卡或第一次有紫微資料 → 呼叫 AI
    if (!card.ai_summary) {
      try {
        const aiRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: user_name,
            gender: gender || "",
            zodiac,
            constellation,
            blood_type,
            bureau: card.bureau || "",
            ming_lord: card.ming_lord || "",
            shen_lord: card.shen_lord || "",
            ming_stars: card.ming_stars || [],
          }),
        });

        const aiData = await aiRes.json();
        if (aiRes.ok && aiData.summary) {
          card.ai_summary = aiData.summary;
        } else {
          card.ai_summary =
            "這樣的你，擁有獨特的個性與人生節奏，善於從經驗中學習，並在挑戰中成長。保持真誠與熱情，你的人生將閃耀光芒。";
        }
      } catch (err) {
        console.warn("⚠️ AI 生成失敗，使用預設摘要");
        card.ai_summary =
          "這樣的你，充滿能量與潛力，懂得平衡理性與感性，在探索人生的過程中找到屬於自己的光。";
      }
    }

    // 更新通用欄位
    card.last_seen = safeNowString();
    card.updated_at = Date.now().toString();

    await writeCard(uid, card);
    return res.json({ ok: true, first_time, card });
  } catch (err) {
    console.error("card-activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}