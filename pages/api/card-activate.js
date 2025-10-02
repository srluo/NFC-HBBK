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
  } catch (e) {
    const t = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return t.toISOString().replace("T", " ").slice(0, 19);
  }
}

async function readCard(uid) {
  const key = `card:${uid}`;
  try {
    const str = await redis.get(key);
    if (typeof str === "string") {
      try { return JSON.parse(str); } catch (e) { console.error("JSON parse error", e); }
    }
  } catch (e) {
    console.error("redis.get error", e);
  }
  try {
    const hash = await redis.hgetall(key);
    if (hash && Object.keys(hash).length > 0) return hash;
  } catch (e) {
    console.error("redis.hgetall error", e);
  }
  return null;
}

async function writeCard(uid, card) {
  const key = `card:${uid}`;
  await redis.set(key, JSON.stringify(card));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { token, user_name, blood_type, hobbies, birth_time, d } = req.body || {};
    if (!token || !user_name || !d) {
      return res.status(400).json({ error: "缺少必要參數" });
    }

    const [uid, birthday, issuedAt, ts] = Buffer.from(token, "base64")
      .toString()
      .split(":");

    const { lunarDate, zodiac, constellation } = calcZodiac(d);

    // 讀取原有資料
    let existing = (await readCard(uid)) || {};

    // merge 更新
    const card = {
      ...existing,
      status: "ACTIVE",
      user_name,
      blood_type: blood_type || existing.blood_type || "",
      hobbies: hobbies || existing.hobbies || "",
      birth_time: birth_time || existing.birth_time || "",
      birthday: d,
      lunar_birthday: lunarDate,
      zodiac,
      constellation,
      points: Number(existing.points || 0) + 20, // 每次開卡禮加 20
      last_ts: ts || existing.last_ts,
      last_seen: safeNowString(),
      updated_at: Date.now(),
    };

    await writeCard(uid, card);

    return res.json({ ok: true, card });
  } catch (err) {
    console.error("activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
