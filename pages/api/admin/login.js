import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { user, pass } = req.body || {};
  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASS = process.env.ADMIN_PASS;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!ADMIN_USER || !ADMIN_PASS || !JWT_SECRET) {
    console.error("❌ 管理登入環境變數缺失");
    return res.status(500).json({ error: "伺服器設定錯誤" });
  }

  if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
    return res.status(401).json({ error: "未授權" });
  }

  try {
    const token = jwt.sign({ role: "admin", user }, JWT_SECRET, { expiresIn: "1d" });
    return res.json({ ok: true, token });
  } catch (err) {
    console.error("JWT sign error:", err);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
