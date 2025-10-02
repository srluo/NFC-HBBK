"use client";
import { useState } from "react";

export default function ActivatePage() {
  const [status, setStatus] = useState("idle");
  const [form, setForm] = useState({
    uid: "",
    name: "",
    blood_type: "",
    hobbies: "",
    birth_time: "",
    token: "",
    d: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/card-activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus(`error: ${data.error || "unknown error"}`);
      } else {
        setStatus("✅ 卡片啟用成功！");
        // 自動跳轉到生日書展示頁
        window.location.href = `/book?uid=${form.uid}&token=${form.token}`;
      }
    } catch (err) {
      setStatus(`error: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: "1.5rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>🎉 開卡手續</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="姓名/暱稱"
          value={form.name}
          onChange={handleChange}
          required
        />
        <br />

        <select
          name="blood_type"
          value={form.blood_type}
          onChange={handleChange}
          required
        >
          <option value="">血型</option>
          <option value="A">A型</option>
          <option value="B">B型</option>
          <option value="AB">AB型</option>
          <option value="O">O型</option>
        </select>
        <br />

        <input
          type="text"
          name="hobbies"
          placeholder="興趣嗜好"
          value={form.hobbies}
          onChange={handleChange}
        />
        <br />

        <label>出生時辰</label>
        <select
          name="birth_time"
          value={form.birth_time}
          onChange={handleChange}
          required
        >
          <option value="">-- 請選擇 --</option>
          <option value="子時">子時 (23:00–01:00)</option>
          <option value="丑時">丑時 (01:00–03:00)</option>
          <option value="寅時">寅時 (03:00–05:00)</option>
          <option value="卯時">卯時 (05:00–07:00)</option>
          <option value="辰時">辰時 (07:00–09:00)</option>
          <option value="巳時">巳時 (09:00–11:00)</option>
          <option value="午時">午時 (11:00–13:00)</option>
          <option value="未時">未時 (13:00–15:00)</option>
          <option value="申時">申時 (15:00–17:00)</option>
          <option value="酉時">酉時 (17:00–19:00)</option>
          <option value="戌時">戌時 (19:00–21:00)</option>
          <option value="亥時">亥時 (21:00–23:00)</option>
        </select>
        <br />

        <button type="submit" style={{ marginTop: "1rem" }}>
          ✅ 確認送出
        </button>
      </form>

      <p style={{ marginTop: "1rem" }}>{status}</p>
    </div>
  );
}
