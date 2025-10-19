// /pages/api/ziwei-core.js — v2.4.1-stable（Einstein verified）
// ------------------------------------------------------------
// 🪐 紫微命盤 API（對應 /lib/ziweiCore_v2.js）
// ✅ 防呆補強版：檢查 ymd 與 hourLabel 格式、確保輸出完整。
// ------------------------------------------------------------

import { getZiweiCore } from "../../lib/ziweiCore_v2.js";
import { getLunarInfo } from "../../lib/lunarInfo.js";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { ymd, hourLabel, gender } = req.body || {};

    // 🧩 驗證輸入
    if (!ymd || typeof ymd !== "string" || ymd.length !== 8) {
      console.warn("⚠️ 紫微命盤生成失敗: 缺少 ymd");
      return res.status(400).json({ error: "缺少 ymd" });
    }
    if (!hourLabel || hourLabel.length < 1) {
      console.warn("⚠️ 紫微命盤生成失敗: 缺少時辰");
      return res.status(400).json({ error: "缺少時辰" });
    }

    // 🌕 農曆轉換
    const lunarInfo = getLunarInfo(ymd);
    if (!lunarInfo || !lunarInfo.lunar_birthday) {
      console.warn("⚠️ 紫微命盤生成失敗: 農曆資料不完整");
      return res.status(400).json({ error: "農曆資料不完整" });
    }

    const [year, month, day] = lunarInfo.lunar_birthday
      .split("-")
      .map((x) => parseInt(x, 10));
    const hour_branch = hourLabel.replace("時", "");

    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.warn("⚠️ 紫微命盤生成失敗: 月份或日期格式錯誤");
      return res.status(400).json({ error: "月份或日期格式錯誤" });
    }

    // 🪐 呼叫核心演算
    const lunarData = {
      year_ganzhi: lunarInfo.year_ganzhi,
      month,
      day,
      hour_branch,
    };

    const result = getZiweiCore(lunarData, gender || "M");

    console.log("🪐 紫微命盤:", result);
    return res.status(200).json(result);
  } catch (err) {
    console.error("❌ Ziwei-core fatal:", err);
    return res.status(500).json({ error: err.message || "Ziwei-core internal error" });
  }
}