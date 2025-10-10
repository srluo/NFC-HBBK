// /pages/api/card-activate.js — v1.9.5（Lucky Number fix + Redis 安全寫入）
import { redis } from "../../lib/redis";
import { calcZodiac } from "../../lib/zodiac";
import { getLuckyNumber } from "../../lib/luckyNumber";

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
  } catch (e) {
    console.error("redis.hgetall error:", e);
  }
  return null;
}

async function writeCard(uid, data) {
  const key = `card:${uid}`;
  const flat = {};
  for (const [k, v] of Object.entries(data)) {
    // ✅ 統一轉為字串
    flat[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  try {
    await redis.hset(key, flat);
  } catch (e) {
    console.error("redis.hset error:", e);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { token, user_name, gender, blood_type, hobbies, birth_time, birthday } = req.body || {};
    if (!token || !user_name || !birthday)
      return res.status(400).json({ error: "缺少必要參數" });

    // 🔐 解析 UID
    const [uid] = Buffer.from(token, "base64").toString().split(":");
    if (!uid) return res.status(400).json({ error: "Token 解析錯誤" });

    // 🔢 計算生肖、星座
    const { lunarDate, zodiac, constellation } = calcZodiac(birthday);
    const existing = (await readCard(uid)) || {};

    // 🎯 是否第一次開卡
    const first_time = !existing.status || existing.status !== "ACTIVE";
    let points = Number(existing.points || 0);
    if (first_time) points += 20;

    // 🎯 計算幸運數字與描述
    const { number, masterNumber } = getLuckyNumber(birthday);
    const lucky_number = masterNumber
      ? `${masterNumber}（大師數字）`
      : number?.toString() || "";

    const descMap = {
      1: "象徵領導與創造，勇於開拓新局。",
      2: "代表協調與感應，擅長人際互動。",
      3: "充滿靈感與表達力，帶來歡樂與創意。",
      4: "實事求是，重視穩定與秩序。",
      5: "熱愛自由，勇於探索新體驗。",
      6: "充滿愛心與責任感，重視家庭與人際關係。",
      7: "思考深入，追求真理與智慧。",
      8: "擁有強大行動力與影響力。",
      9: "富有同理與包容，渴望助人與理想。",
    };

    let lucky_desc = "";
    if (masterNumber === 11) lucky_desc = "擁有強烈的直覺與靈性洞察力。";
    else if (masterNumber === 22) lucky_desc = "天生的建構者，能將理想化為現實。";
    else if (masterNumber === 33) lucky_desc = "具療癒與啟發能量，象徵無私與人道精神。";
    else lucky_desc = descMap[number] || "具備平衡與創造的特質，能在變化中找到自我節奏。";

    // 🧠 建立卡片資料
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
      lucky_number, // ✅ 改為字串
      lucky_desc,   // ✅ 也存描述
      points: points.toString(),
      last_seen: safeNowString(),
      updated_at: Date.now().toString(),
    };

    // 🧩 AI 生成條件
    const needAI =
      first_time ||
      (!existing.gender && gender) ||
      (!existing.birth_time && birth_time);

    if (needAI) {
      try {
        const aiRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid,
            name: user_name,
            gender,
            zodiac,
            constellation,
            blood_type,
            bureau: existing.bureau || "",
            ming_lord: existing.ming_lord || "",
            shen_lord: existing.shen_lord || "",
            ming_stars: existing.ming_stars || [],
            birthday,
            birth_time,
          }),
        });

        const aiData = await aiRes.json();
        if (aiRes.ok && aiData.summary) {
          card.ai_summary = aiData.summary;
          if (aiData.paragraphs)
            card.ai_summary_paragraphs = JSON.stringify(aiData.paragraphs);
        } else {
          console.warn("⚠️ AI 摘要生成失敗:", aiData.error);
        }
      } catch (e) {
        console.error("AI 生成錯誤:", e);
      }
    }

    await writeCard(uid, card);
    return res.json({ ok: true, first_time, card });
  } catch (err) {
    console.error("card-activate fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
