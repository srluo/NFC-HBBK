import jwt from "jsonwebtoken";

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { user, pass } = req.body || {};
  if (user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS) {
    const token = jwt.sign({ user }, process.env.JWT_SECRET, { expiresIn: "2h" });
    return res.json({ ok: true, token });
  } else {
    return res.status(401).json({ error: "帳號或密碼錯誤" });
  }
}
