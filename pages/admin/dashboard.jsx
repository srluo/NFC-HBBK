"use client";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [cards, setCards] = useState([]);
  const [status, setStatus] = useState("載入中...");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setStatus("❌ 尚未登入");
      return;
    }
    fetch("/api/admin/cards", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) setCards(data.cards);
        else setStatus("❌ 讀取失敗");
      })
      .catch(() => setStatus("❌ 系統錯誤"));
  }, []);

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h2>📋 卡片管理</h2>
      {cards.length > 0 ? (
        <table border="1" cellPadding="6">
          <thead>
            <tr>
              <th>UID</th>
              <th>生日</th>
              <th>狀態</th>
              <th>點數</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c, i) => (
              <tr key={i}>
                <td>{c.uid}</td>
                <td>{c.birthday}</td>
                <td>{c.status}</td>
                <td>{c.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>{status}</p>
      )}
    </div>
  );
}
