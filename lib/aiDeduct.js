// /lib/aiDeduct.js
import { redis } from "./redis.js";

/**
 * 🔹 扣點與交易記錄模組 (v1.41)
 * 適用於所有加值服務，例如：
 * - /api/dailyQuote (AI 模式)
 * - /api/fortune (占卜)
 * - /api/ziwei (紫微流年)
 *
 * 資料結構：
 *   card:<uid>        → Hash (主要帳戶資料)
 *   txlog:<uid>:<ts>  → JSON 交易記錄
 */

function nowString() {
  const now = new Date();
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
}

/**
 * 讀取卡片資料 (hash)
 */
export async function readCard(uid) {
  const key = `card:${uid}`;
  const hash = await redis.hgetall(key);
  return Object.keys(hash).length > 0 ? hash : null;
}

/**
 * 寫入卡片資料
 */
export async function writeCard(uid, fields) {
  const key = `card:${uid}`;
  const data = {};
  for (const [k, v] of Object.entries(fields)) {
    data[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  await redis.hset(key, data);
}

/**
 * 建立交易紀錄
 */
export async function writeTx(uid, service, points, note = "") {
  const ts = Date.now();
  const txKey = `txlog:${uid}:${ts}`;
  const txData = {
    uid,
    service,
    points: points.toString(),
    note,
    time: nowString(),
  };
  await redis.set(txKey, JSON.stringify(txData));
  return txData;
}

/**
 * 扣點邏輯
 * @param {string} uid - 卡片 UID
 * @param {number} cost - 要扣除的點數
 * @param {string} service - 服務代碼，如 "dailyQuote"、"fortune"
 * @returns {Promise<{ ok: boolean, card?: object, error?: string, tx?: object }>}
 */
export async function deductPoints(uid, cost, service) {
  const card = await readCard(uid);
  if (!card) return { ok: false, error: "找不到卡片資料" };

  const current = Number(card.points || 0);
  if (current < cost) {
    return { ok: false, error: "點數不足" };
  }

  const newPoints = current - cost;
  await writeCard(uid, { points: newPoints, updated_at: Date.now().toString() });

  const tx = await writeTx(uid, service, -cost, "AI 扣點");
  return { ok: true, card: { ...card, points: newPoints }, tx };
}

/**
 * 加點邏輯（例如開卡禮、活動獎勵）
 */
export async function addPoints(uid, value, note = "獎勵") {
  const card = await readCard(uid);
  if (!card) return { ok: false, error: "找不到卡片資料" };

  const newPoints = Number(card.points || 0) + Number(value);
  await writeCard(uid, { points: newPoints, updated_at: Date.now().toString() });

  const tx = await writeTx(uid, "reward", value, note);
  return { ok: true, card: { ...card, points: newPoints }, tx };
}