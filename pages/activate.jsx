"use client";
import { useState } from "react";

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
          <label>Token：</label>
          <input
            name="token"
            value={form.token}
            onChange={handleChange}
            required
          />
        </div>
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
          <label>生日 (YYYYMMDD)：</label>
          <input
            name="birthday"
            value={form.birthday}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>血型：</label>
          <input
            name="blood_type"
            value={form.blood_type}
            onChange={handleChange}
          />
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
          <label>出生時間（例如：子時 23:00-01:00）：</label>
          <input
            name="birth_time"
            value={form.birth_time}
            onChange={handleChange}
            placeholder="例如：子時"
          />
        </div>
        <button type="submit">送出</button>
      </form>

      <div style={{ marginTop: "1rem" }}>
        <strong>狀態：</strong> {status}
      </div>
    </div>
  );
}
