
import { redis } from "../../../lib/redis";
import jwt from "jsonwebtoken";

function assertAuth(req, res) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    res.status(401).json({ ok: false, error: "未登入" });
    return null;
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return true;
  } catch {
    res.status(401).json({ ok: false, error: "無效 token" });
    return null;
  }
}

async function readCard(uid) {
  const key = `card:${uid}`;
  const str = await redis.get(key);
  if (str) {
    try { return JSON.parse(str); } catch { return null; }
  }
  const hash = await redis.hgetall(key);
  if (hash && Object.keys(hash).length) return hash;
  return null;
}

async function writeCard(uid, data) {
  await redis.set(`card:${uid}`, JSON.stringify(data));
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  let created = 0;
  const out = [];
  for (let i=0;i<lines.length;i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (i === 0 && /uid/i.test(line) && /birthday/i.test(line)) continue; // skip header
    const [uid, birthday, pointsStr] = line.split(",").map(s=>s.trim());
    if (!uid || !birthday) continue;
    const points = Number(pointsStr || 0);
    out.push({ uid, birthday, points, status: "PENDING" });
  }
  return out;
}

export default async function handler(req, res) {
  if (!assertAuth(req, res)) return;

  // GET: list all
  if (req.method === "GET") {
    const keys = await redis.keys("card:*");
    const cards = [];
    for (const k of keys) {
      const str = await redis.get(k);
      try {
        const obj = JSON.parse(str);
        cards.push({ uid: obj.uid || k.replace("card:", ""), ...obj });
      } catch {
        cards.push({ uid: k.replace("card:", ""), raw: str });
      }
    }
    return res.json({ ok: true, cards });
  }

  // POST: create or CSV import
  if (req.method === "POST") {
    const { mode, card, csvText } = req.body || {};
    if (mode === "csv") {
      if (!csvText) return res.status(400).json({ ok: false, error: "缺少 csvText" });
      const items = parseCSV(csvText);
      for (const it of items) {
        const existing = await readCard(it.uid);
        const base = existing || {};
        const data = {
          ...base,
          uid: it.uid,
          birthday: it.birthday,
          status: base.status || "PENDING",
          points: typeof base.points === "number" ? base.points : it.points || 0,
          updated_at: Date.now(),
        };
        await writeCard(it.uid, data);
      }
      return res.json({ ok: true, created: items.length });
    } else if (mode === "single") {
      if (!card || !card.uid) return res.status(400).json({ ok: false, error: "缺少 card.uid" });
      const base = (await readCard(card.uid)) || {};
      const data = {
        ...base,
        uid: card.uid,
        birthday: card.birthday || base.birthday || "",
        status: card.status || base.status || "PENDING",
        points: typeof card.points === "number" ? card.points : (base.points || 0),
        updated_at: Date.now(),
      };
      await writeCard(card.uid, data);
      return res.json({ ok: true });
    } else {
      return res.status(400).json({ ok: false, error: "未知 mode" });
    }
  }

  // PATCH: update single
  if (req.method === "PATCH") {
    const { card } = req.body || {};
    if (!card || !card.uid) return res.status(400).json({ ok: false, error: "缺少 card.uid" });
    const base = (await readCard(card.uid)) || { uid: card.uid };
    const data = {
      ...base,
      birthday: card.birthday ?? base.birthday,
      status: card.status ?? base.status ?? "PENDING",
      points: typeof card.points === "number" ? card.points : (base.points || 0),
      user_name: card.user_name ?? base.user_name,
      last_seen: base.last_seen,
      last_ts: base.last_ts,
      updated_at: Date.now(),
    };
    await writeCard(card.uid, data);
    return res.json({ ok: true });
  }

  // DELETE: remove one
  if (req.method === "DELETE") {
    const { uid } = req.body || {};
    if (!uid) return res.status(400).json({ ok: false, error: "缺少 uid" });
    await redis.del(`card:${uid}`);
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
