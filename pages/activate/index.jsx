"use client";
/* /pages/activate/index.jsx — v1.62a
   ✅ 修正：開卡成功後自動跳轉
   ✅ 修正：Footer 不跑版
   ✅ 更新：出生時辰選單（含早子、晚子）
*/

import { useState } from "react";
import styles from "./activate.module.css";

export default function ActivatePage() {
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    name: "",
    gender: "",
    birthday_detail: "",
    blood_type: "",
    hobbies: "",
    birth_time: ""
  });

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
        setStatus(`❌ 錯誤：${data.error || "未知錯誤"}`);
      } else {
        if (data.first_time) {
          setStatus(`🎉 開卡成功！已獲得 20 點開卡禮，目前點數：${data.card.points}`);
          // ✅ 成功後自動跳轉
          setTimeout(() => {
            window.location.href = `/book?token=${data.card.token}`;
          }, 1200);
        } else {
          setStatus(`✅ 資料更新成功，目前點數：${data.card.points}`);
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("⚠️ 系統錯誤，請稍後再試。");
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>NFC 靈動生日書開卡 ✨</h1>

        <label>姓名</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="請輸入姓名"
        />

        <label>性別</label>
        <select name="gender" value={form.gender} onChange={handleChange}>
          <option value="">請選擇</option>
          <option value="男">男</option>
          <option value="女">女</option>
        </select>

        <label>生日</label>
        <input
          type="text"
          name="birthday_detail"
          value={form.birthday_detail}
          onChange={handleChange}
          placeholder="例如：19650404"
        />

        <label>血型</label>
        <select name="blood_type" value={form.blood_type} onChange={handleChange}>
          <option value="">請選擇</option>
          <option value="A 型">A 型</option>
          <option value="B 型">B 型</option>
          <option value="O 型">O 型</option>
          <option value="AB 型">AB 型</option>
        </select>

        <label>興趣嗜好</label>
        <input
          type="text"
          name="hobbies"
          value={form.hobbies}
          onChange={handleChange}
          placeholder="例如：NFC, Music"
        />

        <label>出生時辰</label>
        <select name="birth_time" value={form.birth_time} onChange={handleChange}>
          <option value="">請選擇</option>
          <option value="早子時 (00:00–00:59)">早子時 (00:00–00:59)</option>
          <option value="丑時 (01:00–02:59)">丑時 (01:00–02:59)</option>
          <option value="寅時 (03:00–04:59)">寅時 (03:00–04:59)</option>
          <option value="卯時 (05:00–06:59)">卯時 (05:00–06:59)</option>
          <option value="辰時 (07:00–08:59)">辰時 (07:00–08:59)</option>
          <option value="巳時 (09:00–10:59)">巳時 (09:00–10:59)</option>
          <option value="午時 (11:00–12:59)">午時 (11:00–12:59)</option>
          <option value="未時 (13:00–14:59)">未時 (13:00–14:59)</option>
          <option value="申時 (15:00–16:59)">申時 (15:00–16:59)</option>
          <option value="酉時 (17:00–18:59)">酉時 (17:00–18:59)</option>
          <option value="戌時 (19:00–20:59)">戌時 (19:00–20:59)</option>
          <option value="亥時 (21:00–22:59)">亥時 (21:00–22:59)</option>
          <option value="晚子時 (23:00–23:59)">晚子時 (23:00–23:59)</option>
        </select>

        <button className={styles.button} onClick={handleSubmit}>
          送出開卡 ✨
        </button>
      </div>

      <div className={styles.statusBox}>{status}</div>

    </div>
  );
}