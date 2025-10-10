// /lib/redis.js — v1.7.9 永久防呆版（統一字串化解決 luckyNumber 問題）
import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
  },
});

redis.on("error", (err) => console.error("Redis Client Error", err));

(async () => {
  if (!redis.isOpen) await redis.connect();
})();

/** ✅ 統一轉字串，確保 Redis 不會把數字吃掉 */
function toRedisString(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** ✅ 寫入卡片資料（全部字串化） */
export async function writeCard(uid, data) {
  const key = `card:${uid}`;
  const flat = {};
  for (const [k, v] of Object.entries(data)) {
    flat[k] = toRedisString(v);
  }
  try {
    await redis.hSet(key, flat);
  } catch (e) {
    console.error("redis.hSet error:", e);
  }
}

/** ✅ 讀取卡片資料（全部字串化回傳） */
export async function readCard(uid) {
  const key = `card:${uid}`;
  try {
    const hash = await redis.hGetAll(key);
    const result = {};
    for (const [k, v] of Object.entries(hash)) {
      result[k] = String(v ?? "");
    }
    return result;
  } catch (e) {
    console.error("redis.hGetAll error:", e);
    return {};
  }
}
