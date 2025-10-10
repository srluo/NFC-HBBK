// /pages/api/card-activate.js — v1.8.7（首開導向 + 時辰標籤補全 + opened 控制）
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

const TIME_LABELS = {
  子: "00:00~00:59（早子）/23:00~23:59（晚子）",
  丑: "01:00~02:59（丑）",
  寅: "03:00~04:59（寅）",
  卯: "05:00~06:59（卯）",
  辰: "07:00~08:59（辰）",
  巳: "09:00~10:59（巳）",
  午: "11:00~12:59（午）",
  未: "13:00~14:59（未）",
  申: "15:00~16:59（申）",
  酉: "17:00~18:59（酉）",
  戌: "19:00~20:59（戌）",
  亥: "21:00~22:59（亥）",
};

async function readCard(uid) {
  const key = `card:${uid}`;
  const hash = await redis.hgetall(key);
  return hash && Object.keys(hash).length ? hash : null;
}

async function writeCard(uid, data) {
  const key = `card:${uid}`;
  const flat = {};
  for (const [k, v] of Object.entries(data)) {
    flat[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  await redis.hset(key, flat);
}

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
      birth_time_label,
      birthday,
    } = req.body || {};
    if (!token || !user_name || !birthday)
      return res.status(400).json({ error: "缺少必要參數" });

    const [uid] = Buffer.from(token, "base64").toString().split(":");
    if (!uid) return res.status(400).json({ error: "Token 解析錯誤" });

    const { lunarDate, zodiac, constellation } = calcZodiac(birthday);
    const existing = (await readCard(uid)) || {};

    // 判斷是否首次開卡
    const wasOpened = existing.opened === "true" || existing.opened === true;
    const first_time = !wasOpened;

    let points = Number(existing.points || 0);
    if (first_time) points += 20;

    const card = {
      ...existing,
      uid,
      status: "ACTIVE",
      user_name,
      gender: gender || existing.gender || "",
      blood_type: blood_type || existing.blood_type || "",
      hobbies: hobbies || existing.hobbies || "",
      birth_time: birth_time || existing.birth_time || "",
      birth_time_label:
        birth_time_label ||
        TIME_LABELS[birth_time] ||
        existing.birth_time_label ||
        "",
      birthday,
      lunar_birthday: lunarDate,
      zodiac,
      constellation,
      points: String(points),
      last_seen: safeNowString(),
      updated_at: Date.now().toString(),
    };

    if (first_time) {
      card.opened = "false";
      card.created_at = Date.now().toString();
    }

    // ✅ AI 生成流程（保持不變）
    const needAI =
      first_time ||
      (!existing.gender && gender) ||
      (!existing.birth_time && birth_time);
    if (needAI) {
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
            bureau: existing.bureau || "",
            ming_lord: existing.ming_lord || "",
            shen_lord: existing.shen_lord || "",
            ming_stars: existing.ming_stars || [],
          }),
        });
        const aiData = await aiRes.json();
        if (aiRes.ok && aiData.summary) card.ai_summary = aiData.summary;
        else console.warn("⚠️ AI 摘要生成失敗:", aiData.error);
      } catch (err) {
        console.error("AI 生成錯誤:", err);
      }
    }

    await writeCard(uid, card);
    return res.json({ ok: true, first_time, card });
  } catch (err) {
    console.error("card-activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
