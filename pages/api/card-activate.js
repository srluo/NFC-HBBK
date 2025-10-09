import { redis } from "../../lib/redis";
import { calcZodiac } from "../../lib/zodiac";
import { getLuckyNumber } from "../../lib/luckyNumber";

// ✅ 安全時間字串
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

// ✅ Redis 讀寫
async function readCard(uid) {
  const key = `card:${uid}`;
  const hash = await redis.hgetall(key).catch(() => ({}));
  return Object.keys(hash).length ? hash : null;
}
async function writeCard(uid, data) {
  const key = `card:${uid}`;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  await redis.hset(key, out);
}

// ✅ OpenAI 產生 80 字摘要
async function generateAISummary(seed) {
  try {
    const prompt = `
以下是個人的出生摘要：
星座：${seed.constellation}座
生命靈數：${seed.lifepath}
命宮主星：${(seed.mingStars || []).join("、")}
命主：${seed.mingLord}，身主：${seed.shenLord}
五行局：${seed.bureau}
血型：${seed.bloodType}

請以溫暖中立的語氣，撰寫 80 字內的個人性格摘要。`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt.trim() }],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.error("AI summary error:", err);
    return "";
  }
}

// ✅ 主處理流程
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { token, user_name, blood_type, hobbies, birth_time, birthday } = req.body || {};
    if (!token || !user_name || !birthday) {
      return res.status(400).json({ error: "缺少必要參數", got: req.body });
    }

    const [uid, issuedBirthday, issuedAt, ts] = Buffer.from(token, "base64").toString().split(":");
    const { lunarDate, zodiac, constellation } = calcZodiac(birthday);
    const lucky = getLuckyNumber(birthday);

    // 取得紫微核心
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (req.headers.host ? `https://${req.headers.host}` : "");
    const ziweiRes = await fetch(`${baseUrl}/api/ziwei-core`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ymd: `${birthday.slice(0, 4)}-${birthday.slice(4, 6)}-${birthday.slice(6, 8)}`,
        hourLabel: birth_time,
      }),
    });
    const ziwei = await ziweiRes.json();

    const existing = (await readCard(uid)) || {};
    let first_time = false;
    let points = Number(existing.points || 0);
    if (!existing.status || existing.status !== "ACTIVE") {
      points += 20;
      first_time = true;
    }

    // 🌱 AI Seed
    const ai_seed = {
      constellation,
      lifepath: lucky.number,
      bureau: ziwei.bureau,
      mingBranch: ziwei.ming_branch,
      shenBranch: ziwei.shen_branch,
      mingLord: ziwei.ming_lord,
      shenLord: ziwei.shen_lord,
      mingStars: ziwei.ming_stars,
      bloodType: blood_type,
    };

    // 🧠 AI Summary（首次開卡才生成）
    let ai_summary = existing.ai_summary || "";
    if (first_time && process.env.OPENAI_API_KEY) {
      ai_summary = await generateAISummary(ai_seed);
    }

    // 📘 寫回卡片
    const card = {
      ...existing,
      uid,
      status: "ACTIVE",
      user_name,
      blood_type,
      hobbies: hobbies || "",
      birth_time: birth_time || "",
      birthday,
      lunar_birthday: lunarDate,
      zodiac,
      constellation,
      points: points.toString(),
      last_ts: ts || existing.last_ts || "",
      last_seen: safeNowString(),
      updated_at: Date.now().toString(),
      ai_seed: JSON.stringify(ai_seed),
      ai_summary_v1: ai_summary,
    };

    await writeCard(uid, card);
    res.json({ ok: true, first_time, card });

  } catch (err) {
    console.error("activate fatal error:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
}
