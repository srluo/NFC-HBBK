// ------------------------------------------------------------
// /lib/fortuneCore.js — v1.1.0-stable
// ✅ 整合 getLunarInfo → getFourPillarsFromLunar → getZiweiCore
// ✅ 單一呼叫回傳完整命盤資料
// ✅ 支援容錯、缺參數自動跳過
// ------------------------------------------------------------

import { getLunarInfo } from "./lunarInfo.js";
import { getFourPillarsFromLunar } from "./fourPillars.js";
import { getZiweiCore } from "./ziweiCore_v2.js";

export async function fortuneCore(birthday, birth_time = "", gender = "") {
  const stamp = new Date().toISOString().split("T")[0];
  console.log(`🔹 [fortuneCore] 執行日期: ${stamp}`);
  console.log(`📅 生日=${birthday}, 性別=${gender}, 時辰=${birth_time}`);

  try {
    if (!birthday || String(birthday).length !== 8) {
      throw new Error("缺少或格式錯誤的生日 (YYYYMMDD)");
    }

    // 🌕 Step 1. 農曆轉換
    const lunar = getLunarInfo(String(birthday));
    if (!lunar?.lunar_birthday || !lunar?.year_ganzhi) {
      throw new Error("農曆轉換失敗（year_ganzhi 缺失）");
    }
    console.log("🌕 農曆:", lunar);

    // 🪐 Step 2. 八字四柱
    let pillars = {};
    try {
      pillars = getFourPillarsFromLunar({
        year_ganzhi: lunar.year_ganzhi,
        month: lunar.lunar_month,
        day: lunar.lunar_day,
        hour_branch: birth_time || "",
      });
      console.log("🪐 四柱:", pillars);
    } catch (e) {
      console.warn("⚠️ 四柱生成失敗:", e.message);
      pillars = {};
    }

    // 🔮 Step 3. 紫微命盤
    let ziwei = {};
    if (gender && birth_time) {
      try {
        ziwei = getZiweiCore(
          {
            year_ganzhi: lunar.year_ganzhi,
            month: lunar.lunar_month,
            day: lunar.lunar_day,
            hour_branch: birth_time,
          },
          gender
        );
        console.log("🔮 紫微命盤:", {
          bureau: ziwei.bureau,
          ming_branch: ziwei.ming_branch,
          shen_branch: ziwei.shen_branch,
          ming_lord: ziwei.ming_lord,
          shen_lord: ziwei.shen_lord,
          ming_main_stars: ziwei.ming_main_stars,
        });
      } catch (e) {
        console.warn("⚠️ 紫微命盤生成失敗:", e.message);
        ziwei = {};
      }
    } else {
      console.log("🟡 缺少性別或出生時辰 → 跳過紫微命盤。");
    }

    // ✅ Step 4. 組合結果
    const result = {
      ok: true,
      lunar,
      pillars,
      ziwei,
    };

    console.log("✅ 最終命盤結果:", JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    console.error("❌ fortuneCore error:", err.message);
    return { ok: false, error: err.message };
  }
}