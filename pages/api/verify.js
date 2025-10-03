
// 簡化示範：驗證 uuid + 生日，產生一次性 token（依你正式邏輯替換）
export default async function handler(req, res) {
  try {
    const { d, uuid } = req.query || {};
    if (!d || !uuid) return res.status(400).json({ status: "ERROR", error: "缺少參數" });
    const uid = uuid.slice(0, 14); // 依你實際 UID 長度取法
    const issuedAt = Date.now().toString();
    const ts = uuid.slice(-8);
    const token = Buffer.from(`${uid}:${d}:${issuedAt}:${ts}:000001`).toString("base64");
    return res.json({ status: "PENDING", token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ status: "ERROR", error: "伺服器錯誤" });
  }
}
