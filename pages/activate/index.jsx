// /pages/activate/index.jsx — v1.62c-final（穩定無 Footer + idle 修正版）
"use client";

import { useState, useEffect } from "react";
import styles from "./activate.module.css";

export default function Activate() {
  const [status, setStatus] = useState("idle"); // ✅ 初始狀態 idle
  const [form, setForm] = useState({
    token: "",
    user_name: "",
    gender: "",
    birthday: "",
    blood_type: "",
    hobbies: "",
    birth_time: ""
  });

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
    setStatus("⏳ 開卡中，請稍候...");

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
          // ✅ 自動跳轉到生日書主頁
          setTimeout(() => {
            window.location.href = `/book?token=${form.token}`;
          }, 1500);
        } else {
          setStatus(`✅ 資料更新成功，目前點數：${data.card.points}`);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ 系統錯誤，請重新感應卡片");
    }
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>NFC 靈動生日書開卡 ✨</h2>

      <form className={styles.card} onSubmit={handleSubmit}>
        <label>姓名</label>
        <input
          name="user_name"
          value={form.user_name}
          onChange={handleChange}
          placeholder="請輸入姓名"
          required
        />

        <label>性別</label>
        <select name="gender" value={form.gender} onChange={handleChange} required>
          <option value="">請選擇</option>
          <option value="男">男</option>
          <option value="女">女</option>
        </select>

        <label>生日</label>
        <input
          name="birthday"
          value={form.birthday}
          readOnly
        />

        <label>血型</label>
        <select name="blood_type" value={form.blood_type} onChange={handleChange}>
          <option value="">請選擇</option>
          <option value="A">A 型</option>
          <option value="B">B 型</option>
          <option value="O">O 型</option>
          <option value="AB">AB 型</option>
        </select>

        <label>興趣嗜好</label>
        <input
          name="hobbies"
          value={form.hobbies}
          onChange={handleChange}
          placeholder="例如：NFC, Music"
        />

        <label>出生時辰</label>
        <select
          name="birth_time"
          value={form.birth_time}
          onChange={handleChange}
        >
          <option value="">請選擇</option>
          <option value="早子">00:00~00:59（早子）</option>
          <option value="丑">01:00~02:59（丑）</option>
          <option value="寅">03:00~04:59（寅）</option>
          <option value="卯">05:00~06:59（卯）</option>
          <option value="辰">07:00~08:59（辰）</option>
          <option value="巳">09:00~10:59（巳）</option>
          <option value="午">11:00~12:59（午）</option>
          <option value="未">13:00~14:59（未）</option>
          <option value="申">15:00~16:59（申）</option>
          <option value="酉">17:00~18:59（酉）</option>
          <option value="戌">19:00~20:59（戌）</option>
          <option value="亥">21:00~22:59（亥）</option>
          <option value="晚子">23:00~23:59（晚子）</option>
        </select>

        <input type="hidden" name="token" value={form.token} />
        <button type="submit" className={styles.button}>送出開卡 ✨</button>
      </form>

      {/* ✅ 僅非 idle 時顯示狀態 */}
      {status !== "idle" && (
        <div className={styles.statusBox}>
          <strong>狀態：</strong> {status}
        </div>
      )}
    </div>
  );
}
