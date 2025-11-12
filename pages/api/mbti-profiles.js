// /pages/api/mbti-profiles.js — v1.0-secure
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), "data", "mbti_profiles.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const json = JSON.parse(raw);

    const { type } = req.query;
    if (type) {
      const t = type.toUpperCase();
      if (!json[t]) {
        return res.status(404).json({ error: `找不到類型 ${t}` });
      }
      return res.status(200).json(json[t]);
    }

    // 無 type 時，可回傳整份或拒絕
    return res.status(200).json(json);
  } catch (err) {
    console.error("讀取 MBTI JSON 錯誤:", err);
    res.status(500).json({ error: "伺服端讀取 MBTI 資料失敗" });
  }
}