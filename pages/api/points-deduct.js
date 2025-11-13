/*****************************************************
 * Points 扣點 API v4.1-unified
 * ----------------------------------------
 * A. 舊模式：token + service → 固定扣 1 點
 * B. MBTI 模式：uid + mode →
 *    - mbti_new    → -5
 *    - mbti_redo   → -3
 *    - mbti_manual → -2
 *****************************************************/
import { redis } from "../../lib/redis";
const TZ = "Asia/Taipei";

function nowTW() {
  try {
    return new Date().toLocaleString("zh-TW", { timeZone: TZ });
  } catch {
    const t = new Date(Date.now() + 8 * 60 * 60 * 1000);
    return t.toISOString().replace("T", " ").slice(0, 19);
  }
}

export default async function handler(req, res) {
  try {
    const { token, service, uid, mode } = req.query || {};

    // ---------------------------------------------------------
    // A. 舊服務：token + service → 固定扣 1 點
    // ---------------------------------------------------------
    if (token && service) {
      const decoded = Buffer.from(token, "base64").toString("utf8");
      const [uidFromToken] = decoded.split(":");
      if (!uidFromToken) {
        return res.status(400).json({ error: "Token 格式錯誤" });
      }

      const cardKey = `card:${uidFromToken}`;
      const card = await redis.hgetall(cardKey);
      if (!card || !("points" in card)) {
        return res.status(404).json({ error: "找不到卡片資料" });
      }

      const before = Number(card.points || 0);
      if (before <= 0) {
        return res.status(403).json({ error: "點數不足" });
      }

      const after = before - 1;
      await redis.hincrby(cardKey, "points", -1);

      const txItem = {
        type: service,
        deducted: 1,
        points_before: before,
        points_after: after,
        date: nowTW(),
      };
      const txListKey = `card:${uidFromToken}:txlog`;
      await redis.lpush(txListKey, JSON.stringify(txItem));
      await redis.ltrim(txListKey, 0, 9);

      return res.status(200).json({
        ok: true,
        service,
        deducted: 1,
        message: `已扣 1 點（目前餘額：${after} 點）`,
        serviceToken: token,
        ...txItem,
      });
    }

    // ---------------------------------------------------------
    // B. MBTI 模式：uid + mode
    // ---------------------------------------------------------
    if (uid && mode) {
      const cardKey = `card:${uid}`;
      const card = await redis.hgetall(cardKey);
      if (!card || !("points" in card)) {
        return res.status(404).json({ error: "找不到卡片資料" });
      }

      const costMap = {
        mbti_new: 5,
        mbti_redo: 3,
        mbti_manual: 2,
      };
      const cost = costMap[mode];

      if (!cost) {
        return res.status(400).json({ error: "無效的 MBTI mode" });
      }

      const before = Number(card.points || 0);
      if (before < cost) {
        return res.status(403).json({ error: "點數不足" });
      }

      const after = before - cost;
      await redis.hset(cardKey, { points: String(after) });

      const txItem = {
        type: mode,
        deducted: cost,
        points_before: before,
        points_after: after,
        date: nowTW(),
      };
      const txListKey = `card:${uid}:txlog`;
      await redis.lpush(txListKey, JSON.stringify(txItem));
      await redis.ltrim(txListKey, 0, 9);

      return res.status(200).json({
        ok: true,
        mode,
        deducted: cost,
        message: `已扣 ${cost} 點（目前餘額：${after} 點）`,
        ...txItem,
      });
    }

    // 兩種模式都沒符合
    return res
      .status(400)
      .json({ error: "請提供 token+service 或 uid+mode 參數" });
  } catch (err) {
    console.error("[points-deduct.js] Error:", err);
    const msg =
      err && typeof err === "object" && "message" in err
        ? err.message
        : String(err);
    return res.status(500).json({ error: "系統錯誤：" + msg });
  }
}