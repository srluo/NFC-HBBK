import { redis } from "@/lib/redis";
import { calcZodiac } from "@/lib/zodiac";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { token, user_name, blood_type, hobbies, birth_time, d } = req.body;
    if (!token || !user_name) {
      return res.status(400).json({ error: "缺少必要參數" });
    }

    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [uid] = decoded.split(":");

    const { lunarDate, zodiac, constellation } = calcZodiac(d);

    const cardKey = `card:${uid}`;
    await redis.hset(cardKey, {
      status: "ACTIVE",
      user_name,
      blood_type,
      hobbies,
      birth_time,
      birthday: d,
      lunar_birthday: lunarDate,
      zodiac,
      constellation,
      points: 20,
      created_at: Date.now(),
      updated_at: Date.now(),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "系統錯誤" });
  }
}
