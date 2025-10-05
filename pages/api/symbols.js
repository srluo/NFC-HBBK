import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  try {
    const filePath = path.join(process.cwd(), "data", "symbols.json");
    const jsonData = fs.readFileSync(filePath, "utf8");
    const symbols = JSON.parse(jsonData);

    const { month } = req.query;
    if (!month) {
      return res.status(200).json(symbols); // 沒帶參數 → 回傳整包
    }

    const m = parseInt(month, 10);
    const item = symbols.find((s) => s.month === m);
    if (!item) {
      return res.status(404).json({ error: `找不到月份資料 (${month})` });
    }

    res.status(200).json(item);
  } catch (err) {
    console.error("symbols API error:", err);
    res.status(500).json({ error: "伺服器錯誤" });
  }
}