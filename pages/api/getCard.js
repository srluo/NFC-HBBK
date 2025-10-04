import { redis } from "../../lib/redis";

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "缺少 token" });

  try {
    // 解碼 token → 取出 uid
    const decoded = Buffer.from(token, "base64").toString();
    const [uid] = decoded.split(":");
    if (!uid) return res.status(400).json({ error: "無效 token" });

    const key = `card:${uid}`;
    const card = await redis.hgetall(key);
    if (!card || Object.keys(card).length === 0) {
      return res.status(404).json({ error: `找不到卡片資料 uid=${uid}` });
    }

    // 判斷是否首次開啟
    let is_first_open = false;
    if (card.status === "ACTIVE" && !card.opened) {
      is_first_open = true;
    }

    // ✅ 將 opened 標記也寫回 HASH（而不是 set 整筆 JSON）
    await redis.hset(key, { ...card, opened: "true" });

    // points 是字串，轉成數字方便前端顯示
    if (card.points) card.points = Number(card.points);

    return res.json({ card: { ...card, opened: true }, is_first_open });
  } catch (err) {
    console.error("getCard fatal error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
