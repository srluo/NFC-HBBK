"use client";
import { useState, useEffect } from "react";

/**
 * NFC BirthdayBook Admin Dashboard v2.9.1-final
 * 功能：
 * ✅ 登入（JWT、自動登入）
 * ✅ 匯入 CSV（貼上或上傳）
 * ✅ 新增單筆
 * ✅ 查詢卡片（全列表、生日搜尋、UID 點擊）
 * ✅ inline 編輯點數、狀態
 * ✅ 自動顯示生命靈數
 * ✅ 點擊表頭可排序（含方向箭頭）
 * ✅ 狀態彩色顯示
 * ✅ 勾選多筆 → 批次刪除
 * ✅ 登入後自動載入、每 5 分鐘自動刷新
 */

function calcLifeNumber(birthday) {
  if (!birthday) return "";
  const clean = String(birthday).replace(/\D/g, "").trim();
  if (clean.length < 6) return "";
  const digits = clean.split("").map((n) => parseInt(n, 10));
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum
      .toString()
      .split("")
      .map((n) => parseInt(n, 10))
      .reduce((a, b) => a + b, 0);
  }
  return sum;
}

function getStatusColor(status) {
  switch (status) {
    case "PENDING":
      return { color: "#b8860b", fontWeight: "bold" }; // 黃金色
    case "ACTIVE":
      return { color: "#228b22", fontWeight: "bold" }; // 綠色
    case "BONUSED":
      return { color: "#1e90ff", fontWeight: "bold" }; // 藍色
    case "LOCKED":
      return { color: "#808080" }; // 灰色
    case "VOID":
      return { color: "#b22222", fontWeight: "bold" }; // 紅色
    default:
      return {};
  }
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [loginForm, setLoginForm] = useState({ user: "", pass: "" });
  const [cards, setCards] = useState([]);
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedUIDs, setSelectedUIDs] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [newCard, setNewCard] = useState({
    uid: "",
    birthday: "",
    points: "0",
    status: "PENDING",
  });

  const [sortField, setSortField] = useState("status");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // ---- 登入 ----
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("登入中...");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.ok && data.token) {
        localStorage.setItem("adminToken", data.token);
        setToken(data.token);
        setMessage("✅ 登入成功！");
        fetchCards(); // 自動載入
      } else setMessage("❌ 登入失敗");
    } catch (err) {
      console.error(err);
      setMessage("伺服器錯誤");
    }
  };

  // ---- 取得卡片列表 ----
  const fetchCards = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/cards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        alert("⚠️ 登入逾時，請重新登入");
        localStorage.removeItem("adminToken");
        setToken("");
        setCards([]);
        return;
      }
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) {
        setCards(data.data);
        setSelectedUIDs([]);
        setSelectAll(false);
      } else {
        setMessage("讀取失敗（資料格式不符）");
      }
    } catch (err) {
      console.error("fetchCards error:", err);
      setMessage("伺服器錯誤");
    }
    setLoading(false);
  };

  // ---- 匯入 CSV ----
  const handleImportCSV = async () => {
    if (!csvText.trim()) return alert("請輸入或上傳 CSV");
    setMessage("匯入中...");
    try {
      const res = await fetch("/api/admin/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: "csv", csvText }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`✅ 匯入完成 (${data.created} 筆)`);
        setCsvText("");
        fetchCards();
      } else setMessage("❌ 匯入失敗");
    } catch (err) {
      console.error(err);
      setMessage("伺服器錯誤");
    }
  };

  // ---- 新增單筆 ----
  const handleAddCard = async () => {
    if (!newCard.uid) return alert("請輸入 UID");
    setMessage("新增中...");
    try {
      const res = await fetch("/api/admin/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: "single", card: newCard }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("✅ 新增成功");
        setNewCard({ uid: "", birthday: "", points: "0", status: "PENDING" });
        fetchCards();
      } else setMessage("❌ 新增失敗");
    } catch (err) {
      console.error(err);
      setMessage("伺服器錯誤");
    }
  };

  // ---- 批次刪除 ----
  const handleBatchDelete = async () => {
    if (selectedUIDs.length === 0) return alert("請先勾選要刪除的卡片");
    if (!confirm(`確定刪除 ${selectedUIDs.length} 張卡片？`)) return;
    try {
      for (const uid of selectedUIDs) {
        await fetch("/api/admin/cards", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ uid }),
        });
      }
      setMessage(`🗑️ 已刪除 ${selectedUIDs.length} 張卡`);
      fetchCards();
    } catch (err) {
      console.error(err);
      alert("批次刪除失敗");
    }
  };

  // ✅ 自動登入、定時刷新
  useEffect(() => {
    const savedToken = localStorage.getItem("adminToken");
    if (savedToken) {
      setToken(savedToken);
      fetchCards();
      const interval = setInterval(() => {
        console.log("⏳ 自動刷新卡片列表...");
        fetchCards();
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, []);

  // ---- 排序 ----
  const order = ["PENDING", "ACTIVE", "BONUSED", "LOCKED", "VOID"];
  const sortedCards = [...cards].sort((a, b) => {
    const valA = a[sortField] || "";
    const valB = b[sortField] || "";
    if (sortField === "status")
      return (order.indexOf(valA) - order.indexOf(valB)) * (sortAsc ? 1 : -1);
    if (!isNaN(valA) && !isNaN(valB))
      return (Number(valA) - Number(valB)) * (sortAsc ? 1 : -1);
    return valA.localeCompare(valB) * (sortAsc ? 1 : -1);
  });

  // ---- 全選切換 ----
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUIDs([]);
      setSelectAll(false);
    } else {
      setSelectedUIDs(sortedCards.map((c) => c.uid));
      setSelectAll(true);
    }
  };

  const toggleSelect = (uid) => {
    setSelectedUIDs((prev) =>
      prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]
    );
  };

  if (!token)
    return (
      <div style={{ maxWidth: 400, margin: "5rem auto", textAlign: "center" }}>
        <h2>🔐 Admin 登入</h2>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="使用者名稱"
            value={loginForm.user}
            onChange={(e) =>
              setLoginForm({ ...loginForm, user: e.target.value })
            }
            style={{ width: "100%", marginBottom: 10 }}
          />
          <input
            type="password"
            placeholder="密碼"
            value={loginForm.pass}
            onChange={(e) =>
              setLoginForm({ ...loginForm, pass: e.target.value })
            }
            style={{ width: "100%", marginBottom: 10 }}
          />
          <button type="submit" style={{ width: "100%" }}>
            登入
          </button>
        </form>
        <p>{message}</p>
      </div>
    );

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>🎛️ NFC BirthdayBook Admin Dashboard</h2>
      <p>{message}</p>

      <div style={{ marginBottom: "1rem" }}>
        <button onClick={fetchCards}>🔄 重新整理</button>
        <button
          onClick={() => {
            localStorage.removeItem("adminToken");
            setToken("");
          }}
        >
          🚪 登出
        </button>
        <button onClick={handleBatchDelete} style={{ marginLeft: "10px" }}>
          🗑️ 批次刪除
        </button>
      </div>

      {/* 📦 匯入 CSV */}
      <h3>📦 匯入 CSV</h3>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => setCsvText(evt.target.result);
          reader.readAsText(file, "UTF-8");
        }}
      />
      <textarea
        rows={5}
        style={{ width: "100%", fontFamily: "monospace", marginTop: 10 }}
        placeholder={"uid,birthday,points\n3949500194A474,19650404,0"}
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
      />
      <button onClick={handleImportCSV}>匯入 CSV</button>

      {/* ➕ 新增單筆 */}
      <h3 style={{ marginTop: "2rem" }}>➕ 新增單筆卡片</h3>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          placeholder="UID"
          value={newCard.uid}
          onChange={(e) => setNewCard({ ...newCard, uid: e.target.value })}
        />
        <input
          placeholder="生日 (YYYYMMDD)"
          value={newCard.birthday}
          onChange={(e) =>
            setNewCard({ ...newCard, birthday: e.target.value })
          }
        />
        <input
          placeholder="點數"
          value={newCard.points}
          onChange={(e) => setNewCard({ ...newCard, points: e.target.value })}
        />
        <button onClick={handleAddCard}>新增</button>
      </div>

      {/* 🔍 查詢 */}
      <h3 style={{ marginTop: "2rem" }}>🔍 查詢卡片（依生日）</h3>
      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="輸入生日 (YYYYMMDD)"
          id="searchBirthday"
          style={{ flex: "1" }}
        />
        <button
          onClick={async () => {
            const keyword = document
              .getElementById("searchBirthday")
              .value.trim();
            if (!keyword) return alert("請輸入生日");
            const res = await fetch("/api/admin/cards", {
              headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!data.ok || !data.data) return alert("讀取資料失敗");
            const filtered = data.data.filter((c) =>
              c.birthday?.includes(keyword)
            );
            if (filtered.length === 0) alert("查無資料");
            setCards(filtered);
          }}
        >
          查詢
        </button>
        <button onClick={fetchCards}>全部</button>
      </div>

      {/* 🗂️ 列表 */}
      <h3>🗂️ 卡片列表（可排序／多選刪除）</h3>
      {loading ? (
        <p>載入中...</p>
      ) : (
        <table
          border="1"
          cellPadding="5"
          style={{ borderCollapse: "collapse", width: "100%" }}
        >
          <thead style={{ background: "#eee" }}>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                />
              </th>
              {["uid", "birthday", "life_no", "points", "status"].map((field) => (
                <th
                  key={field}
                  onClick={() => handleSort(field)}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  {field.toUpperCase()}
                  {sortField === field && (sortAsc ? " ▲" : " ▼")}
                </th>
              ))}
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {sortedCards.map((c, idx) => (
              <tr key={c.uid}>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedUIDs.includes(c.uid)}
                    onChange={() => toggleSelect(c.uid)}
                  />
                </td>
                <td
                  style={{
                    color: "blue",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    const res = await fetch(`/api/admin/cards?uid=${c.uid}`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await res.json();
                    if (data.ok && data.data) {
                      const card = data.data;
                      if (card.status === "ACTIVE") {
                        window.location.href = `/admin/cardView?uid=${card.uid}`;
                      } else {
                        alert(
                          `UID：${data.data.uid}\n生日：${data.data.birthday}\n生命靈數：${calcLifeNumber(
                            data.data.birthday
                          )}\n點數：${data.data.points}\n狀態：${data.data.status}`
                        );
                      }
                    } else alert("❌ 查詢失敗");
                  }}
                >
                  {c.uid}
                </td>
                <td>{c.birthday}</td>
                <td>{calcLifeNumber(c.birthday)}</td>
                <td>
                  <input
                    type="number"
                    value={c.points}
                    onChange={(e) => {
                      const updated = [...cards];
                      updated[idx].points = e.target.value;
                      setCards(updated);
                    }}
                    style={{ width: "80px" }}
                  />
                </td>
                <td style={getStatusColor(c.status)}>
                  <select
                    value={c.status}
                    onChange={(e) => {
                      const updated = [...cards];
                      updated[idx].status = e.target.value;
                      setCards(updated);
                    }}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="BONUSED">BONUSED</option>
                    <option value="LOCKED">LOCKED</option>
                    <option value="VOID">VOID</option>
                  </select>
                </td>
                <td>
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/admin/cards", {
                        method: "PATCH",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ card: c }),
                      });
                      const data = await res.json();
                      alert(data.ok ? "✅ 更新成功" : "❌ 更新失敗");
                    }}
                  >
                                        💾 儲存
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <style jsx>{`
        /* 🔧 隱藏 Chrome / Safari 的上下箭頭 */
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
}