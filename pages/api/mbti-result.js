// /pages/api/mbti-result.js — v1.2-secure
import fs from "fs";
import path from "path";
import { redis } from "../../lib/redis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { uid, mbti_type, mbti_profile } = req.body || {};
    if (!uid) return res.status(400).json({ error: "缺少 UID" });

    const cardKey = `card:${uid}`;
    const card = await redis.hgetall(cardKey);
    if (!card) return res.status(404).json({ error: "找不到卡片資料" });

    let profile = null;

    // ✅ 若前端傳完整 profile，直接使用（例如 first.jsx 查表後）
    if (mbti_profile && mbti_profile.type) {
      profile = {
        ...mbti_profile,
        last_test_ts: new Date().toISOString(),
      };
    }
    // ✅ 若僅傳 mbti_type，則伺服端自行查表
    else if (mbti_type) {
      const filePath = path.join(process.cwd(), "data", "mbti_profiles.json");
      const raw = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(raw);
      const t = mbti_type.toUpperCase();

      if (!json[t]) {
        return res.status(404).json({ error: `找不到 MBTI 類型 ${t} 的資料` });
      }

      profile = {
        type: t,
        summary: json[t].summary,
        overview: json[t].overview,
        relationship: json[t].relationship,
        career: json[t].career,
        icon: json[t].icon,
        last_test_ts: new Date().toISOString(),
      };
    } else {
      return res.status(400).json({ error: "缺少 mbti_type 或 mbti_profile" });
    }

    // ✅ 寫入 Redis（覆蓋 mbti_profile）
    await redis.hset(cardKey, { mbti_profile: JSON.stringify(profile) });

    res.json({ ok: true, type: profile.type });
  } catch (err) {
    console.error("MBTI Result API Error:", err);
    res.status(500).json({ error: "伺服端錯誤，無法寫入 MBTI 結果" });
  }
}