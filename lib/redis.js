// /lib/redis.js — v1.7.9-upstash (Vercel 安全通過版)
// ✅ 採用 Upstash Redis（Serverless REST API），Vercel 100% 相容
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
