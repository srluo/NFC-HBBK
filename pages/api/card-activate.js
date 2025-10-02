import { redis } from "../../lib/redis";
import { calcZodiac } from "../../lib/zodiac";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { token, user_name, blood_type, hobbies, birth_time, d } = req.body;
  if (!token) return res.status(400).json({ error: "缺少 token" });

  const [uid, birthday, issuedAt, ts] = Buffer.from(token, "base64").toString().split(":");

  // 計算生肖、星座（含農曆）
  const zodiacData = calcZodiac(d);

  const card = {
    status: "ACTIVE",
    user_name,
    blood_type,
    hobbies,
    birth_time,
    birthday: d,
    lunar_birthday: zodiacData.lunar,
    zodiac: zodiacData.zodiac,
    constellation: zodiacData.constellation,
    points: 20,
    last_ts: ts,
    last_seen: new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })
  };

  await redis.set(`card:${uid}`, JSON.stringify(card));

  return res.json({ ok: true });
}