// /pages/api/card-activate.js — v1.9.8（AI 背景生成＋精簡版無 paragraphs）
import { redis } from "../../lib/redis";
import { calcZodiac } from "../../lib/zodiac";
import { getLuckyNumber } from "../../lib/luckyNumber";

function safeNowString() {
  const now = new Date();
  try {
    const fmt = new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return fmt.format(now);
  } catch {
    const t = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return t.toISOString().replace("T", " ").slice(0, 19);
  }
}

async function readCard(uid) {
  const key = `card:${uid}`;
  try {
    const hash = await redis.hgetall(key);
    if (hash && Object.keys(hash).length > 0) return hash;
  } catch (e) {
    console.error("redis.hgetall error:", e);
  }
  return null;
}

async function writeCard(uid, data) {
  const key = `card:${uid}`;
  const flat = {};
  for (const [k, v] of Object.entries(data)) {
    flat[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  try {
    await redis.hset(key, flat);
  } catch (e) {
    console.error("redis.hset error:", e);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { token, user_name, gender, blood_type, hobbies, birth_time, birthday } =
      req.body || {};
    if (!token || !user_name || !birthday)
      return res.status(400).json({ error: "缺少必要參數" });

    // 解碼 Token → 取 UID
    const [uid] = Buffer.from(token, "base64").toString().split(":");
    if (!uid) return res.status(400).json({ error: "Token 解析錯誤" });

    // 🧮 基本命理資料
    const { lunarDate, zodiac, constellation } = calcZodiac(birthday);
    const existing = (await readCard(uid)) || {};

    // 🔢 幸運數字
    const { number, masterNumber } = getLuckyNumber(birthday);
    const lucky_number = masterNumber ? `${masterNumber}（大師數字）` : `${number}`;

    // 🆕 是否第一次開卡
    const first_time = !existing.status || existing.status !== "ACTIVE";
    let points = Number(existing.points || 0);
    if (first_time) points += 20;

    // 💾 基本卡資料（先寫入）
    const card = {
      ...existing,
      uid,
      status: "ACTIVE",
      user_name,
      gender: gender || existing.gender || "",
      blood_type: blood_type || existing.blood_type || "",
      hobbies: hobbies || existing.hobbies || "",
      birth_time: birth_time || existing.birth_time || "",
      birthday,
      lunar_birthday: lunarDate,
      zodiac,
      constellation,
      lucky_number,
      points: points.toString(),
      last_seen: safeNowString(),
      updated_at: Date.now().toString(),
    };

    await writeCard(uid, card); // ✅ 先存入 Redis，確保不會卡死

    // 🚀 背景生成 AI 摘要
    if (first_time || (gender && birth_time)) {
      (async () => {
        try {
          const aiRes = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/ai`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: user_name,
                gender,
                zodiac,
                constellation,
                blood_type,
                bureau: card.bureau || "",
                ming_lord: card.ming_lord || "",
                shen_lord: card.shen_lord || "",
                ming_stars: card.ming_stars || [],
              }),
            }
          );

          const aiData = await aiRes.json();
          if (aiRes.ok && aiData.summary) {
            await writeCard(uid, {
              ...card,
              ai_summary: aiData.summary.trim(),
            });
            console.log(`✅ AI 摘要完成並更新 Redis: ${uid}`);
          } else {
            console.warn("⚠️ AI 摘要生成失敗:", aiData.error);
          }
        } catch (e) {
          console.error("AI 背景生成錯誤:", e);
        }
      })();
    }

    // 🎯 即時回傳（不等 AI）
    return res.json({ ok: true, first_time, card });
  } catch (err) {
    console.error("card-activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
