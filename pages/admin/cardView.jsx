/**
 * NFC BirthdayBook Admin CardView v2.7.4-AdminTXlogStable
 * ------------------------------------------------------------
 * ✅ 含 PIN 管理、TXLOG 檢視、💰 點數調整（Admin Only）
 * ✅ 修復 points=0 被轉為 false
 * ✅ TXLOG 即時刷新
 * ✅ 調整操作寫入 TXLOG
 * ------------------------------------------------------------
 */

"use client";
import { useEffect, useState } from "react";

export default function CardView() {
  const [card, setCard] = useState(null);
  const [txlog, setTxlog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pinStatus, setPinStatus] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get("uid");
    const t = localStorage.getItem("adminToken");
    setToken(t);
    if (!uid || !t) return;

    fetch(`/api/admin/cards?uid=${uid}&includeTxlog=1`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.data) {
          setCard(data.data);
          setTxlog(data.txlog || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: "2rem" }}>載入中...</p>;
  if (!card) return <p style={{ padding: "2rem" }}>查無資料</p>;

  // ----------------- 工具函式 -----------------
  const refreshCard = async () => {
    const r = await fetch(`/api/admin/cards?uid=${card.uid}&includeTxlog=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (d.ok) {
      setCard(d.data);
      setTxlog(d.txlog || []);
    }
  };

  const renderField = (key, value) => {
    if (value === null || value === undefined) return "–";
    if (key === "points" || key === "lucky_number") return String(value);
    const str = String(value).trim();
    if (str === "" || str === "null" || str === "undefined" || str === "00000000")
      return "–";
    if (typeof value === "object") {
      return (
        <pre style={{ whiteSpace: "pre-wrap", background: "#f8f8f8", padding: 4 }}>
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return str;
  };

  // ----------------- 💰 點數調整 -----------------
  async function adjustPoints() {
    const deltaEl = document.getElementById("deltaInput");
    const noteEl = document.getElementById("noteInput");
    const delta = Number(deltaEl.value);
    const note = noteEl?.value?.trim() || "";

    if (!delta || isNaN(delta)) {
      alert("⚠️ 請輸入有效的加減點數（例如 +5 或 -3）");
      return;
    }

    if (!confirm(`確定要${delta > 0 ? "加值" : "扣除"} ${Math.abs(delta)} 點？`)) return;

    try {
      const res = await fetch("/api/admin/points-adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: card.uid, delta, reason: note }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "更新失敗");
        return;
      }
      alert(
        `✅ 已${delta > 0 ? "加值" : "扣除"} ${Math.abs(delta)} 點\n餘額：${data.points_before} → ${data.points_after}`
      );
      deltaEl.value = "";
      noteEl.value = "";
      await refreshCard();
    } catch (e) {
      console.error(e);
      alert("❌ 系統錯誤");
    }
  }

  // ----------------- PIN 操作 -----------------
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
        await refreshCard();
      } else setPinStatus(`⚠️ ${data.error || "操作失敗"}`);
    } catch {
      setPinStatus("❌ 系統錯誤");
    }
  };

  // ----------------- 畫面 -----------------
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>🪪 卡片詳細資料</h2>
      <p><strong>UID：</strong>{card.uid}</p>

      <table border="1" cellPadding="5" style={{ borderCollapse: "collapse", width: "100%", fontFamily: "monospace" }}>
        <thead style={{ background: "#f0f0f0" }}>
          <tr><th style={{ width: "25%" }}>欄位</th><th>內容</th></tr>
        </thead>
        <tbody>
          {Object.entries(card).map(([k, v]) => (
            <tr key={k}>
              <td style={{ fontWeight: "bold" }}>{k}</td>
              <td>{renderField(k, v)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 💰 點數調整 */}
      <div style={{ marginTop: "2rem", background: "#fff8e1", padding: "1rem", borderRadius: "8px" }}>
        <h3>💰 點數調整（Admin Only）</h3>
        <p>輸入要加減的點數數量，將即時更新卡片餘額，並自動寫入 TXLOG。</p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "0.5rem" }}>
          <input
            type="number"
            id="deltaInput"
            placeholder="輸入正數加值／負數扣點"
            style={{ width: "160px", padding: "6px" }}
          />
          <input
            type="text"
            id="noteInput"
            placeholder="備註（選填）"
            style={{ width: "240px", padding: "6px" }}
          />
          <button
            onClick={adjustPoints}
            style={{
              background: "#ffb300",
              color: "#000",
              fontWeight: "bold",
              padding: "6px 12px",
              borderRadius: "6px",
            }}
          >
            💾 執行點數更新
          </button>
        </div>
      </div>

      {/* 🔐 PIN 管理 */}
      <div style={{ marginTop: "2rem", background: "#fafafa", padding: "1rem", borderRadius: "8px" }}>
        <h3>🔐 PIN 管理</h3>
        <p>狀態：{card.pins?.enabled === "true" || card.pins?.enabled === true ? "✅ 已啟用" : "⚪ 未啟用"}</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "0.5rem" }}>
          <button onClick={() => handlePinAction("enable")}>啟用 PIN 鎖</button>
          <button onClick={() => handlePinAction("disable")}>停用 PIN 鎖</button>
          <button onClick={() => handlePinAction("reset")}>重設 PIN 碼</button>
        </div>
        {pinStatus && <p style={{ marginTop: "0.5rem" }}>{pinStatus}</p>}
      </div>

      {/* 🧾 TXLOG 檢視 */}
      {txlog.length > 0 && (
        <div style={{ marginTop: "2rem", background: "#eef3f8", padding: "1rem", borderRadius: "8px" }}>
          <h3>🧾 最近紀錄（TXLOG）</h3>
          <table border="1" cellPadding="5" style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px" }}>
            <thead style={{ background: "#d7e4f5" }}>
              <tr><th>#</th><th>類型</th><th>服務</th><th>時間</th><th>摘要</th></tr>
            </thead>
            <tbody>
              {txlog.map((t, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{t.type || "—"}</td>
                  <td>{t.service || "—"}</td>
                  <td>{t.date || "—"}</td>
                  <td>{t.reason || t.summary?.slice?.(0, 60) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => window.history.back()}>⬅️ 返回列表</button>
      </div>
    </div>
  );
}