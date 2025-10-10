// /pages/api/card-activate.js — v1.7.1 首次開卡完整版生成版
import { redis } from "../../lib/redis";
import { calcZodiac } from "../../lib/zodiac";

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
  const hash = await redis.hgetall(key);
  return Object.keys(hash).length > 0 ? hash : null;
}

async function writeCard(uid, card) {
  const key = `card:${uid}`;
  const flat = {};
  for (const [k, v] of Object.entries(card)) {
    flat[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  await redis.hset(key, flat);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { token, user_name, gender, blood_type, hobbies, birth_time, birthday } = req.body || {};
    if (!token || !user_name || !birthday)
      return res.status(400).json({ error: "缺少必要參數", got: req.body });

    const [uid, issuedBirthday, issuedAt, ts] = Buffer.from(token, "base64").toString().split(":");
    const { lunarDate, zodiac, constellation } = calcZodiac(birthday);

    const existing = (await readCard(uid)) || {};
    let first_time = false;
    let points = Number(existing.points || 0);
    if (!existing.status || existing.status !== "ACTIVE") {
      points += 20;
      first_time = true;
    }

    // 🧠 若首次開卡 → 生成完整版 AI 摘要
    let ai_summary = existing.ai_summary || "";
    if (first_time) {
      try {
        const aiRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: user_name,
            gender,
            zodiac,
            constellation,
            bureau: existing.bureau || "",
            ming_lord: existing.ming_lord || "",
            shen_lord: existing.shen_lord || "",
            ming_stars: existing.ming_stars || [],
            blood_type,
          }),
        });
        const aiData = await aiRes.json();
        if (aiData.ok && aiData.summary) ai_summary = aiData.summary;
      } catch (err) {
        console.error("AI Summary 生成失敗:", err);
      }
    }

    // 🪄 組合資料
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
      ai_summary, // ✅ 寫入完整版 AI 摘要
      points: points.toString(),
      last_ts: ts || existing.last_ts || "",
      last_seen: safeNowString(),
      updated_at: Date.now().toString(),
    };

    await writeCard(uid, card);

    return res.json({ ok: true, first_time, card });
  } catch (err) {
    console.error("activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}