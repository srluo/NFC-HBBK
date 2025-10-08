import { redis } from "../../lib/redis";
import { calcZodiac } from "../../lib/zodiac";
import { generateAISummary } from "../../lib/ai"; // ✅ 新增：AI Summary 函數

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

// ✅ Redis Hash 寫入輔助
async function writeCard(uid, card) {
  const key = `card:${uid}`;
  const hashData = {};
  for (const [k, v] of Object.entries(card)) {
    hashData[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  await redis.hset(key, hashData);
}

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { token, user_name, blood_type, hobbies, birth_time, birthday } =
      req.body || {};
    if (!token || !user_name || !birthday)
      return res.status(400).json({ error: "缺少必要參數" });

    // 解析 token
    const [uid, issuedBirthday, issuedAt, ts] = Buffer.from(token, "base64")
      .toString()
      .split(":");

    const key = `card:${uid}`;
    const existing = (await redis.hgetall(key)) || {};

    // ✅ 計算星座與生肖
    const { lunarDate, zodiac, constellation } = calcZodiac(birthday);

    let first_time = false;
    let points = Number(existing.points || 0);
    let ai_summary = existing.ai_summary || "";

    // 🟢 首次開卡（PENDING → ACTIVE）
    if (!existing.status || existing.status !== "ACTIVE") {
      first_time = true;
      points += 20; // 開卡禮

      // ✅ 生成 AI Summary（免費）
      ai_summary = await generateAISummary({
        user_name,
        birthday,
        constellation,
        zodiac,
        blood_type,
        birth_time,
      });
    }

    // ✅ 組合卡片資料
    const card = {
      ...existing,
      uid,
      status: "ACTIVE",
      user_name,
      birthday,
      blood_type,
      hobbies,
      birth_time,
      lunar_birthday: lunarDate,
      zodiac,
      constellation,
      ai_summary,
      points: points.toString(),
      opened: existing.opened || "false",
      last_ts: ts || existing.last_ts || "",
      last_seen: safeNowString(),
      updated_at: Date.now().toString(),
    };

    // ✅ 寫回 Redis
    await writeCard(uid, card);

    return res.json({ ok: true, first_time, card });
  } catch (err) {
    console.error("activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
