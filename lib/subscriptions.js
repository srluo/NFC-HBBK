// /lib/subscriptions.js
// ------------------------------------------------------------
// 通用訂閱資料處理模組
// 支援 Upstash Redis 回傳的 string 或 object
// 並確保寫回時一定為 JSON 字串。
// ------------------------------------------------------------

/**
 * ✅ 安全解析訂閱資料
 * @param {string|object|null} raw - 從 Redis 取得的 subscriptions 欄位
 * @returns {object} - 解析後的訂閱物件
 */
export function parseSubscriptions(raw) {
  if (!raw) return {};

  // Upstash hgetall 可能直接傳 object
  if (typeof raw === "object") return raw;

  try {
    return JSON.parse(raw.trim());
  } catch (err) {
    console.warn("⚠️ subscriptions 無法解析:", raw);
    return {};
  }
}

/**
 * ✅ 將訂閱物件轉為可儲存格式
 * @param {object} subs - 訂閱物件
 * @returns {string} - JSON 字串
 */
export function stringifySubscriptions(subs) {
  try {
    return JSON.stringify(subs || {});
  } catch (err) {
    console.warn("⚠️ subscriptions 無法字串化:", subs);
    return "{}";
  }
}

/**
 * ✅ 更新或新增某項服務的訂閱資訊
 * @param {object} subs - 現有訂閱物件
 * @param {string} service - 服務名稱 (e.g. "daily")
 * @param {object} data - 要寫入的內容
 * @returns {object} - 更新後的新物件
 */
export function updateSubscription(subs, service, data) {
  const updated = { ...(subs || {}) };
  updated[service] = { ...(updated[service] || {}), ...data };
  return updated;
}

/**
 * ✅ 檢查某項服務是否仍有效
 * @param {object} subs - 訂閱物件
 * @param {string} service - 服務名稱
 * @returns {boolean} - 是否有效
 */
export function isSubscriptionActive(subs, service) {
  if (!subs || !subs[service]) return false;
  const item = subs[service];
  const until = item?.until ? new Date(item.until) : null;
  if (!item.active || !until) return false;
  return until >= new Date();
}