
"use client";
import { useState } from "react";

export default function AdminLogin() {
  const [form, setForm] = useState({ user: "", pass: "" });
  const [status, setStatus] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("登入中...");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        localStorage.setItem("admin_token", data.token);
        window.location.href = "/admin/dashboard";
      } else {
        setStatus("❌ " + (data.error || "登入失敗"));
      }
    } catch (err) {
      setStatus("❌ 系統錯誤");
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto", fontFamily: "Microsoft JhengHei" }}>
      <h2>🔐 管理員登入</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "1rem", alignItems: "end" }}>
        <div>
          <label>帳號：</label>
          <input name="user" value={form.user} onChange={handleChange} required />
        </div>
        <div>
          <label>密碼：</label>
          <input type="password" name="pass" value={form.pass} onChange={handleChange} required />
        </div>
        <button type="submit">登入</button>
      </form>
      <p>{status}</p>
    </div>
  );
}
