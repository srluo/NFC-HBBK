// /pages/api/sign.js
import { sign } from "../../lib/sign.js";

export default async function handler(req, res) {
  try {
    const { uid, ts, tp = "HB", pin } = req.query;
    if (!uid || !ts) return res.status(400).json({ ok: false, error: "缺少參數" });

    // ✅ 工廠 PIN 驗證
    const VALID_PIN = process.env.FACTORY_PIN || "53616743";
    if (pin !== VALID_PIN) {
      return res.status(403).json({ ok: false, error: "PIN 驗證失敗" });
    }

    const key = process.env.SIGN_KEY || "NFCTOGO_PRIVATE_KEY";
    const rlc = sign({ uid, tp, ts, key });
    res.status(200).json({ ok: true, rlc });
  } catch (err) {
    console.error("[API:sign] Error:", err);
    res.status(500).json({ ok: false, error: "簽章失敗" });
  }
}
