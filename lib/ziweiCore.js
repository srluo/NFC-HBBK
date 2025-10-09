// /lib/ziweiCore.js
// v1.59 前端模組：封裝紫微命盤核心 API，支援快取與錯誤保護
// ------------------------------------------------------------

const cache = new Map();

/**
 * 取得紫微核心命盤資料（命宮、身宮、五行局、命主、身主、命宮主星）
 * @param {Object} opts
 * @param {string} opts.ymd - 西元生日 (yyyy-mm-dd)
 * @param {string} opts.hourLabel - 例如「酉時」
 * @param {string} [opts.gender] - 「男」或「女」（非必填）
 * @returns {Promise<Object>} 紫微命盤資料
 */
export async function getZiweiCore({ ymd, hourLabel, gender }) {
  if (!ymd || !hourLabel) {
    console.warn("⚠️ 缺少必要參數 ymd/hourLabel");
    return { error: "缺少參數" };
  }

  const key = `${ymd}_${hourLabel}_${gender || ""}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const res = await fetch("/api/ziwei-core", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ymd, hourLabel, gender }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      console.error("❌ Ziwei-Core error:", data.error);
      return { error: data.error || "api error" };
    }

    cache.set(key, data);
    return data;
  } catch (err) {
    console.error("❌ Ziwei-Core fetch failed:", err);
    return { error: "network error" };
  }
}

/**
 * 清除快取（for debug 或重算）
 */
export function clearZiweiCache() {
  cache.clear();
  console.log("🧹 Ziwei-Core cache cleared");
}