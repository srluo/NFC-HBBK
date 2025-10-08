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
  try {
    const hash = await redis.hgetall(key);
    if (hash && Object.keys(hash).length > 0) return hash;
    return null;
  } catch {
    return null;
  }
}

async function writeCard(uid, card) {
  const key = `card:${uid}`;
  const hashData = {};
  for (const [k, v] of Object.entries(card)) {
    hashData[k] = String(v ?? "");
  }
  await redis.hset(key, hashData);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { token, user_name, blood_type, hobbies, birth_time, birthday } = req.body || {};
    if (!token || !user_name || !birthday) {
      return res.status(400).json({ error: "缺少必要參數" });
    }

    const [uid, issuedBirthday, issuedAt, ts] = Buffer.from(token, "base64").toString().split(":");
    const { lunarDate, zodiac, constellation } = calcZodiac(birthday);

    const existing = (await readCard(uid)) || {};
    let first_time = false;
    let points = Number(existing.points || 0);
    if (!existing.status || existing.status !== "ACTIVE") {
      points += 20;
      first_time = true;
    }

    const card = {
      ...existing,
      uid,
      status: "ACTIVE",
      user_name,
      blood_type: blood_type || existing.blood_type || "",
      hobbies: hobbies || existing.hobbies || "",
      birth_time: birth_time || existing.birth_time || "",
      birthday: String(birthday),
      lunar_birthday: lunarDate,
      zodiac,
      constellation,
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