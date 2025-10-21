// ------------------------------------------------------------
// /lib/fortuneCore.js — v1.6-jieqiSplitStable
// ✅ 整合 jieqi + 農曆雙系統
// ✅ 回傳節氣月 pillars.jieqi_month 與 農曆月 lunar.lunar_month
// ✅ 通過 1965-04-04 酉時 = 乙巳·己卯·戊子·辛酉 驗證
// ------------------------------------------------------------

import { getLunarInfo } from "./lunarConverter.js";
import { getFourPillars_Jieqi } from "./fourPillars.js";
import { getZiweiCore } from "./ziweiCore_v2.js";

function sanitizeHourLabel(hourLabel) {
  if (!hourLabel) return "";
  return String(hourLabel).replace("時", "").trim();
}

export async function fortuneCore(birthday, birth_time = "", gender = "") {
  const stamp = new Date().toISOString().split("T")[0];
  console.log(`🔹 [fortuneCore v1.6] 執行日期: ${stamp}`);
  console.log(`📅 生日=${birthday}, 性別=${gender}, 時辰=${birth_time}`);

  try {
    if (!birthday || String(birthday).length !== 8)
      throw new Error("缺少或格式錯誤的生日 (YYYYMMDD)");

    // 🌕 Step 1. 西曆 → 農曆（for 紫微）
    const lunar = await getLunarInfo(String(birthday));
    if (!lunar?.year_ganzhi)
      throw new Error("農曆轉換失敗（year_ganzhi 缺失）");
    console.log("🌕 農曆:", lunar);

    // 🕐 Step 2. 節氣月八字四柱
    const hour_branch = sanitizeHourLabel(birth_time);

    const pillars = getFourPillars_Jieqi({
      ymd: String(birthday),
      year_ganzhi: lunar.year_ganzhi,
      month: lunar.lunar_month,
      day: lunar.lunar_day,
      hour_branch,
    });
    console.log("🪐 八字四柱:", pillars);

    // 🌀 加入節氣月資訊
    const jieqi_month = getFourPillars_Jieqi({
      ymd: String(birthday),
      year_ganzhi: lunar.year_ganzhi,
      month: lunar.lunar_month,
      day: lunar.lunar_day,
      hour_branch,
    }).month; // 僅取月柱名作參考

    // 🔮 Step 3. 紫微命盤（採用農曆月）
    let ziwei = {};
    if (gender && hour_branch) {
      try {
        ziwei = getZiweiCore(
          {
            year_ganzhi: lunar.year_ganzhi,
            month: lunar.lunar_month,
            day: lunar.lunar_day,
            hour_branch,
          },
          gender
        );
      } catch (e) {
        console.warn("⚠️ 紫微命盤生成失敗:", e.message);
        ziwei = {};
      }
    } else {
      console.log("🟡 缺少性別或出生時辰 → 跳過紫微命盤。");
    }

    // ✅ Step 4. 組合最終結果
    const result = {
      ok: true,
      birthday,
      gender,
      birth_time,
      lunar: { ...lunar, jieqi_month: pillars.jieqi_month || null },
      pillars: {
        ...pillars,
        jieqi_month,
      },
      ziwei,
    };

    //console.log("✅ 最終命盤結果:", JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    console.error("❌ fortuneCore error:", err.message);
    return { ok: false, error: err.message };
  }
}