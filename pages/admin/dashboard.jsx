
"use client";
import { useEffect, useMemo, useState } from "react";

export default function Dashboard() {
  const [cards, setCards] = useState([]);
  const [status, setStatus] = useState("載入中...");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [csvText, setCsvText] = useState("uid,birthday,points\n3949500194A474,19650404,20");

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const filtered = useMemo(() => {
    const q = (search || "").trim();
    if (!q) return cards;
    return cards.filter((c) =>
      (c.uid || "").includes(q) ||
      (c.user_name || "").includes(q) ||
      (c.birthday || "").includes(q)
    );
  }, [cards, search]);

  async function load() {
    if (!token) {
      setStatus("❌ 尚未登入"); 
      window.location.href = "/admin"; 
      return;
    }
    try {
      const res = await fetch("/api/admin/cards", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.ok) {
        setCards(data.cards);
        setStatus("");
      } else {
        setStatus("❌ 讀取失敗");
      }
    } catch {
      setStatus("❌ 系統錯誤");
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing({ uid: "", birthday: "", points: 0, status: "PENDING" });
    setShowModal(true);
  }
  function openEdit(c) {
    setEditing({ ...c });
    setShowModal(true);
  }
  function closeModal() {
    setShowModal(false);
    setEditing(null);
  }

  async function saveEdit() {
    if (!editing.uid) { alert("需要 UID"); return; }
    const method = cards.find(c => c.uid === editing.uid) ? "PATCH" : "POST";
    const body = method === "POST"
      ? { mode: "single", card: editing }
      : { mode: "patch", card: editing };
    const res = await fetch("/api/admin/cards", {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      closeModal();
      load();
    } else {
      alert("失敗: " + (data.error || "未知錯誤"));
    }
  }

  async function deleteCard(uid) {
    if (!confirm(`確定刪除卡片 ${uid} ?`)) return;
    const res = await fetch("/api/admin/cards", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ uid }),
    });
    const data = await res.json();
    if (res.ok && data.ok) load();
    else alert("刪除失敗");
  }

  async function importCSV() {
    const res = await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode: "csv", csvText }),
    });
    const data = await res.json();
    if (res.ok && data.ok) { alert(`已匯入 ${data.created} 筆`); load(); }
    else alert("匯入失敗: " + (data.error || "未知錯誤"));
  }

  return (
    <div style={{ padding: "1rem", fontFamily: "Microsoft JhengHei" }}>
      <h2>📋 卡片管理</h2>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: 12 }}>
        <input placeholder="搜尋 UID / 姓名 / 生日"
               value={search} onChange={e => setSearch(e.target.value)}
               style={{ padding: 6, width: 260 }}/>
        <button onClick={openNew}>➕ 新增卡片</button>
      </div>

      {status ? <p>{status}</p> : (
        <table border="1" cellPadding="6" style={{ width: "100%", maxWidth: 1000 }}>
          <thead>
            <tr>
              <th>UID</th>
              <th>姓名</th>
              <th>生日</th>
              <th>狀態</th>
              <th>點數</th>
              <th>最後使用</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.uid}>
                <td>{c.uid}</td>
                <td>{c.user_name || "-"}</td>
                <td>{c.birthday || "-"}</td>
                <td>{c.status || "-"}</td>
                <td>{c.points ?? 0}</td>
                <td>{c.last_seen || "-"}</td>
                <td>
                  <button onClick={() => openEdit(c)}>編輯</button>{" "}
                  <button onClick={() => deleteCard(c.uid)}>刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: 24 }}>
        <h3>📤 批次匯入 CSV</h3>
        <p style={{ marginTop: -6, color: "#666" }}>欄位：uid,birthday,points（例：3949500194A474,19650404,20）</p>
        <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
                  rows={6} style={{ width: "100%", maxWidth: 600 }}/>
        <br/>
        <button onClick={importCSV}>匯入</button>
      </div>

      {showModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,.3)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ background: "#fff", padding: 16, borderRadius: 10, minWidth: 360 }}>
            <h3>{cards.find(c => c.uid === editing.uid) ? "編輯卡片" : "新增卡片"}</h3>
            <div>
              <label>UID</label>
              <input value={editing.uid} onChange={e => setEditing({ ...editing, uid: e.target.value })} />
            </div>
            <div>
              <label>生日</label>
              <input value={editing.birthday||""} onChange={e => setEditing({ ...editing, birthday: e.target.value })} />
            </div>
            <div>
              <label>點數</label>
              <input type="number" value={editing.points??0} onChange={e => setEditing({ ...editing, points: Number(e.target.value) })} />
            </div>
            <div>
              <label>狀態</label>
              <select value={editing.status||"PENDING"} onChange={e => setEditing({ ...editing, status: e.target.value })}>
                <option value="PENDING">PENDING</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </div>
            <div style={{ marginTop: 12 }}>
              <button onClick={saveEdit}>儲存</button>{" "}
              <button onClick={closeModal}>關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
