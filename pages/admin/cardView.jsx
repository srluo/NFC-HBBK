"use client";
import { useEffect, useState } from "react";

export default function CardView() {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("uid");
    const token = localStorage.getItem("adminToken");
    if (!uid || !token) return;

    fetch(`/api/admin/cards?uid=${uid}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.data) setCard(data.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ padding: "2rem" }}>載入中...</p>;
  if (!card) return <p style={{ padding: "2rem" }}>查無資料</p>;

  // ---------- 排序欄位順序 ----------
  const fieldOrder = [
    "uid",
    "user_name",
    "gender",
    "blood_type",
    "birthday",
    "birth_time",
    "lunar_birthday",
    "zodiac",
    "constellation",
    "four_pillars",
    "ziweis",
    "lucky_number",
    "lucky_desc",
    "points",
    "status",
    "opened",
    "created_at",
    "updated_at",
    "last_seen",
    "ai_summary",
    "subscriptions",
  ];

  // ---------- 格式化時間 ----------
  const formatTW = (date) => {
    const local = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return local
      .toISOString()
      .replace("T", " ")
      .slice(0, 19)
      .replace(/-/g, "/");
  };

  // ---------- 格式化欄位顯示 ----------
  const renderField = (key, value) => {
    if (value === null || value === undefined) return "–";
    const str = String(value).trim();

    // 跳過空值
    if (str === "" || str === "null" || str === "undefined" || str === "00000000")
      return "–";

    // ✅ JSON 物件
    if (typeof value === "object") {
      return (
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "#f8f8f8",
            padding: "4px",
            borderRadius: "4px",
          }}
        >
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }

    // ✅ Unix 時戳（毫秒或秒）
    if (/^\d{10,13}$/.test(str)) {
      const n = Number(str);
      if (!Number.isNaN(n)) {
        const ms = str.length >= 13 ? n : n * 1000;
        try {
          return <span>{formatTW(new Date(ms))}</span>;
        } catch (_) {}
      }
    }

    // ✅ ISO 日期
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
      try {
        return <span>{formatTW(new Date(str))}</span>;
      } catch (_) {}
    }

    // ✅ 布林值
    if (str === "1" || str.toLowerCase() === "true") {
      return <span style={{ color: "green", fontWeight: "bold" }}>✔ True</span>;
    }
    if (str === "0" || str.toLowerCase() === "false") {
      return <span style={{ color: "red", fontWeight: "bold" }}>✘ False</span>;
    }

    // ✅ JSON 字串
    if (str.startsWith("{") && str.endsWith("}")) {
      try {
        const obj = JSON.parse(str);
        return (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#f8f8f8",
              padding: "4px",
              borderRadius: "4px",
            }}
          >
            {JSON.stringify(obj, null, 2)}
          </pre>
        );
      } catch (_) {}
    }

    // ✅ 其他字串
    return str;
  };

  // ---------- 排序與合併欄位 ----------
  const sortedFields = [
    ...fieldOrder.filter((key) => key in card),
    ...Object.keys(card).filter((key) => !fieldOrder.includes(key)),
  ];

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>🪪 卡片詳細資料</h2>
      <p><strong>UID：</strong>{card.uid}</p>

      <table
        border="1"
        cellPadding="5"
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontFamily: "monospace",
        }}
      >
        <thead style={{ background: "#f0f0f0" }}>
          <tr>
            <th style={{ width: "25%" }}>欄位</th>
            <th>內容</th>
          </tr>
        </thead>
        <tbody>
          {sortedFields.map((key) => (
            <tr key={key}>
              <td style={{ fontWeight: "bold" }}>{key}</td>
              <td>{renderField(key, card[key])}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => window.history.back()}>⬅️ 返回列表</button>
      </div>
    </div>
  );
}