"use client";
import { useEffect, useState } from "react";

/**
 * NFC BirthdayBook Admin CardView v2.6.1-PIN
 * ------------------------------------------------------------
 * ✅ 顯示欄位固定順序（含 pins）
 * ✅ JSON 自動 prettify
 * ✅ PIN 管理（啟用 / 重設）
 * ✅ 時戳／ISO 時間自動轉台灣時區
 * ✅ 可安全回溯 baseline（v2.5.0）
 */

export default function CardView() {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pinStatus, setPinStatus] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("uid");
    const t = localStorage.getItem("adminToken");
    setToken(t);
    if (!uid || !t) return;

    fetch(`/api/admin/cards?uid=${uid}`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.data) setCard(data.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={{ padding: "2rem" }}>載入中...</p>;
  if (!card) return <p style={{ padding: "2rem" }}>查無資料</p>;

  // ---------- 欄位顯示順序（含 pins） ----------
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
    "pins",
    "subscriptions",
    "created_at",
    "updated_at",
    "last_seen",
    "ai_summary",
  ];

  // ---------- 格式化時間 ----------
  const formatTW = (date) => {
    const local = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return local.toISOString().replace("T", " ").slice(0, 19).replace(/-/g, "/");
  };

  // ---------- 格式化欄位 ----------
  const renderField = (key, value) => {
    if (value === null || value === undefined) return "–";
    const str = String(value).trim();

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

    // ✅ Unix 時戳或 ISO 時間
    if (/^\d{10,13}$/.test(str)) {
      const n = Number(str);
      if (!Number.isNaN(n)) {
        const ms = str.length >= 13 ? n : n * 1000;
        try {
          return <span>{formatTW(new Date(ms))}</span>;
        } catch (_) {}
      }
    }
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

    return str;
  };

  // ---------- 排序與合併欄位 ----------
  const sortedFields = [
    ...fieldOrder.filter((key) => key in card),
    ...Object.keys(card).filter((key) => !fieldOrder.includes(key)),
  ];

  // ---------- PIN 操作 ----------
  const handlePinAction = async (action) => {
    try {
      let payload = { uid: card.uid, action };

      if (action === "enable" || action === "reset") {
        const p = prompt("請輸入 4–6 位數的新 PIN：");
        if (!p) return;
        if (!/^\d{4,6}$/.test(p)) {
          setPinStatus("⚠️ 新 PIN 必須為 4–6 位數字");
          return;
        }
        payload.newPin = p;
      }

      const res = await fetch("/api/admin/pin-control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setPinStatus(`✅ ${data.message}`);
        // 成功後重新讀取卡片，更新 pins 顯示
        const r = await fetch(`/api/admin/cards?uid=${card.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const fresh = await r.json();
        if (fresh.ok && fresh.data) setCard(fresh.data);
      } else {
        setPinStatus(`⚠️ ${data.error || "操作失敗"}`);
      }
    } catch (err) {
      console.error(err);
      setPinStatus("❌ 系統錯誤");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>🪪 卡片詳細資料</h2>
      <p><strong>UID：</strong>{card.uid}</p>

      {/* 詳細表格 */}
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

      {/* PIN 管理面板 */}
      <div style={{ marginTop: "2rem", background: "#fafafa", padding: "1rem", borderRadius: "8px" }}>
        <h3>🔒 PIN 管理</h3>
        <p>
          狀態：
          {card.pins?.enabled === "true" || card.pins?.enabled === true
            ? "✅ 已啟用"
            : "⚪ 未啟用"}
        </p>
        <div style={{ display: "flex", gap: "10px", marginTop: "0.5rem" }}>
          <button onClick={() => handlePinAction("enable")}>啟用 PIN 鎖</button>
          <button onClick={() => handlePinAction("disable")}>停用 PIN 鎖</button>
          <button onClick={() => handlePinAction("reset")}>重設 PIN 碼</button>
        </div>
        {pinStatus && (
          <p style={{ marginTop: "0.5rem", color: "#333" }}>{pinStatus}</p>
        )}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => window.history.back()}>⬅️ 返回列表</button>
      </div>
    </div>
  );
}