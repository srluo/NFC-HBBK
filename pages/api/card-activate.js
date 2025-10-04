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

// ✅ 改成 Hash 讀取
async function readCard(uid) {
  const key = `card:${uid}`;
  try {
    const hash = await redis.hgetall(key);
    if (hash && Object.keys(hash).length > 0) {
      // 數字欄位轉型
      if (hash.points) hash.points = Number(hash.points);
      return hash;
    }
    return null;
  } catch (e) {
    console.error("❌ redis.hgetall error:", e);
    return null;
  }
}

// ✅ 改成 Hash 寫入
async function writeCard(uid, card) {
  const key = `card:${uid}`;
  try {
    await redis.hset(key, card);
  } catch (e) {
    console.error("❌ redis.hset error:", e);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { token, user_name, blood_type, hobbies, birth_time, birthday } = req.body || {};
    if (!token || !user_name || !birthday) {
      return res.status(400).json({ error: "缺少必要參數", got: req.body });
    }

    // 解析 token
    const [uid, issuedBirthday, issuedAt, ts] = Buffer.from(token, "base64")
      .toString()
      .split(":");

    // 計算生肖 / 星座 / 農曆
    const { lunarDate, zodiac, constellation } = calcZodiac(birthday);

    // 讀取原有資料
    const existing = (await readCard(uid)) || {};

    // 判斷是否第一次 ACTIVE
    let first_time = false;
    let points = Number(existing.points || 0);
    if (!existing.status || existing.status !== "ACTIVE") {
      points += 20; // 🎁 開卡禮
      first_time = true;
    }

    // 合併新資料
    const card = {
      ...existing,
      uid,
      status: "ACTIVE",
      user_name,
      blood_type: blood_type || existing.blood_type || "",
      hobbies: hobbies || existing.hobbies || "",
      birth_time: birth_time || existing.birth_time || "",
      birthday,
      lunar_birthday: lunarDate,
      zodiac,
      constellation,
      points,
      last_ts: ts || existing.last_ts,
      last_seen: safeNowString(),
      updated_at: Date.now(),
    };

    // ✅ Hash 寫回 Redis
    await writeCard(uid, card);

    return res.json({ ok: true, first_time, card });
  } catch (err) {
    console.error("activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
