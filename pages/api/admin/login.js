import jwt from "jsonwebtoken";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { user, pass } = req.body || {};
  if (user !== process.env.ADMIN_USER || pass !== process.env.ADMIN_PASS) {
    return res.status(401).json({ error: "帳號或密碼錯誤" });
  }

  // ✅ Token 有效期改成 7 天
  const token = jwt.sign({ user }, process.env.JWT_SECRET, { expiresIn: "7d" });

  return res.json({ ok: true, token });
}
