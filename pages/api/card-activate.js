// /pages/api/card-activate.js — v1.8.6 fix-hour+ziwei
import { redis } from "../../lib/redis";
import { calcZodiac } from "../../lib/zodiac";

function safeNowString() {
  const now = new Date();
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      timeZone: "Asia/Taipei",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(now);
  } catch {
    const t = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    return t.toISOString().replace("T", " ").slice(0, 19);
  }
}

async function readCard(uid) {
  const key = `card:${uid}`;
  const hash = await redis.hgetall(key).catch(() => null);
  return hash && Object.keys(hash).length ? hash : null;
}
async function writeCard(uid, data) {
  const key = `card:${uid}`;
  const flat = {};
  for (const [k, v] of Object.entries(data)) {
    flat[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  await redis.hset(key, flat).catch((e) => console.error("redis.hset error:", e));
}

// ⬇︎ 把任何「17:00~18:59（酉）」或「酉」或「晚子」…抽出單一地支
function normalizeHourToBranch(input) {
  if (!input) return "";
  const m = String(input).match(/[子丑寅卯辰巳午未申酉戌亥]/);
  return m ? m[0] : "";
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
      birth_time,         // 前端 value=地支（本版已改），但仍做保險處理
      birth_time_label,   // 供 UI 顯示，可有可無
      birthday,
    } = req.body || {};

    if (!token || !user_name || !birthday) {
      return res.status(400).json({ error: "缺少必要參數" });
    }

    // 解析 UID
    const [uid] = Buffer.from(token, "base64").toString().split(":");
    if (!uid) return res.status(400).json({ error: "Token 解析錯誤" });

    // 星座 / 生肖 / 農曆
    const { lunarDate, zodiac, constellation } = calcZodiac(birthday);
    const existing = (await readCard(uid)) || {};

    const first_time = !existing.status || existing.status !== "ACTIVE";
    let points = Number(existing.points || 0);
    if (first_time) points += 20;

    // 1) 正規化時辰（只留地支）
    const hourBranch = normalizeHourToBranch(birth_time || existing.birth_time || "");
    const ymd = `${birthday.slice(0, 4)}-${birthday.slice(4, 6)}-${birthday.slice(6, 8)}`;

    // 2) 預設值：沿用既有，避免覆蓋成空
    let bureau   = existing.bureau   || "";
    let ming_lord= existing.ming_lord|| "";
    let shen_lord= existing.shen_lord|| "";
    let ming_stars = existing.ming_stars ? JSON.parse(existing.ming_stars) : [];

    // 3) 若有生日與時辰，就去算紫微核心（即使不是首次，也可補寫）
    if (ymd && hourBranch) {
      try {
        const base = process.env.NEXT_PUBLIC_BASE_URL || "";
        const ziRes = await fetch(`${base}/api/ziwei-core`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ymd, hourLabel: hourBranch }),
        });
        const zi = await ziRes.json();

        if (ziRes.ok && !zi.error) {
          bureau     = zi.bureau     || bureau;
          ming_lord  = zi.ming_lord  || ming_lord;
          shen_lord  = zi.shen_lord  || shen_lord;
          ming_stars = zi.ming_stars || ming_stars;
        } else {
          console.warn("ziwei-core fail:", zi?.error || ziRes.status);
        }
      } catch (e) {
        console.error("ziwei-core error:", e);
      }
    }

    // 4) 組卡資料並寫入
    const card = {
      ...existing,
      uid,
      status: "ACTIVE",
      user_name,
      gender: gender || existing.gender || "",
      blood_type: blood_type || existing.blood_type || "",
      hobbies: hobbies || existing.hobbies || "",
      birth_time: hourBranch,                       // 只存地支（正確值）
      birth_time_label: birth_time_label || existing.birth_time_label || "", // 顯示文字
      birthday,
      lunar_birthday: lunarDate,
      zodiac,
      constellation,
      bureau,
      ming_lord,
      shen_lord,
      ming_stars,                                   // 陣列（後端會 JSON.stringify）
      points: String(points),
      last_seen: safeNowString(),
      updated_at: Date.now().toString(),
      opened: "true",
    };

    // 5) 首次或補齊資料時，可一併刷新 AI（保留你現有判斷）
    const needAI =
      first_time ||
      (!existing.gender && gender) ||
      (!existing.birth_time && hourBranch);

    if (needAI) {
      try {
        const aiRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: user_name,
            gender: card.gender,
            zodiac: card.zodiac,
            constellation: card.constellation,
            blood_type: card.blood_type,
            bureau: card.bureau,
            ming_lord: card.ming_lord,
            shen_lord: card.shen_lord,
            ming_stars: card.ming_stars,
          }),
        });
        const ai = await aiRes.json();
        if (aiRes.ok && ai.summary) card.ai_summary = ai.summary;
      } catch (e) {
        console.error("AI summary error:", e);
      }
    }

    await writeCard(uid, card);
    return res.json({ ok: true, first_time, card });
  } catch (err) {
    console.error("card-activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
