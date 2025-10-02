"use client";
import { useState, useEffect } from "react";

export default function Activate() {
  const [status, setStatus] = useState("idle");
  const [form, setForm] = useState({
    token: "",
    user_name: "",
    birthday: "",
    blood_type: "",
    hobbies: "",
    birth_time: ""
  });

  // 自動帶入 URL 上的 d=生日 與 token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const d = urlParams.get("d") || "";
    const token = urlParams.get("token") || "";
    setForm((prev) => ({
      ...prev,
      birthday: d,
      token
    }));
  }, []);

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
        setStatus(`❌ 錯誤: ${data.error || "未知錯誤"}`);
      } else {
        if (data.first_time) {
          setStatus(`🎉 開卡成功！已獲得 20 點開卡禮，目前點數：${data.card.points}`);
        } else {
          setStatus(`✅ 資料更新成功，目前點數：${data.card.points}`);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ 系統錯誤");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>🔑 卡片開卡手續</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>姓名/暱稱：</label>
          <input
            name="user_name"
            value={form.user_name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>生日：</label>
          <input
            name="birthday"
            value={form.birthday}
            readOnly
          />
        </div>
        <div>
          <label>血型：</label>
          <select
            name="blood_type"
            value={form.blood_type}
            onChange={handleChange}
          >
            <option value="">-- 請選擇 --</option>
            <option value="A">A 型</option>
            <option value="B">B 型</option>
            <option value="O">O 型</option>
            <option value="AB">AB 型</option>
          </select>
        </div>
        <div>
          <label>興趣嗜好：</label>
          <input
            name="hobbies"
            value={form.hobbies}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>出生時辰：</label>
          <select
            name="birth_time"
            value={form.birth_time}
            onChange={handleChange}
          >
            <option value="">-- 請選擇 --</option>
            <option value="子時">子時 (23:00-01:00)</option>
            <option value="丑時">丑時 (01:00-03:00)</option>
            <option value="寅時">寅時 (03:00-05:00)</option>
            <option value="卯時">卯時 (05:00-07:00)</option>
            <option value="辰時">辰時 (07:00-09:00)</option>
            <option value="巳時">巳時 (09:00-11:00)</option>
            <option value="午時">午時 (11:00-13:00)</option>
            <option value="未時">未時 (13:00-15:00)</option>
            <option value="申時">申時 (15:00-17:00)</option>
            <option value="酉時">酉時 (17:00-19:00)</option>
            <option value="戌時">戌時 (19:00-21:00)</option>
            <option value="亥時">亥時 (21:00-23:00)</option>
          </select>
        </div>

        <button type="submit">送出</button>
      </form>

      <div style={{ marginTop: "1rem" }}>
        <strong>狀態：</strong> {status}
      </div>
    </div>
  );
}
