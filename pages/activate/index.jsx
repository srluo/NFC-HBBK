// /pages/activate/index.jsx — v2.0.0（AI 等待同步 + 正確跳轉 + 使用者體驗優化版）
"use client";

import { useState, useEffect } from "react";
import styles from "./activate.module.css";

export default function Activate() {
  const [status, setStatus] = useState("idle");
  const [form, setForm] = useState({
    token: "",
    user_name: "",
    gender: "",
    birthday: "",
    blood_type: "",
    hobbies: "",
    birth_time: "",
  });

  // 取得 URL 參數
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("d") || "";
    const token = params.get("token") || "";
    setForm((prev) => ({ ...prev, birthday: d, token }));
  }, []);

  // 欄位改動
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // 開卡提交
  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasGender = !!form.gender;
    const hasTime = !!form.birth_time;

    // 🔮 若只填一項，提醒使用者
    if ((hasGender && !hasTime) || (!hasGender && hasTime)) {
      alert("若要開啟紫微層級分析，請同時填寫性別與出生時辰。");
      return;
    }

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
        return;
      }

      // 🧠 AI 生成提示（v2.0.0 版會等待完成）
      if (data.first_time) {
        setStatus("🧠 AI 智慧摘要生成中...（約 5 秒）");

        setTimeout(() => {
          setStatus(
            `🎉 開卡成功！已獲得 20 點開卡禮，目前點數：${data.card.points}`
          );
        }, 1200);

        // ✅ 生成完畢 → 自動跳轉
        setTimeout(() => {
          window.location.href = `/book/first?token=${form.token}`;
        }, 3000);
      } else {
        setStatus(`✅ 更新成功，目前點數：${data.card.points}`);
        setTimeout(() => {
          window.location.href = `/book/first?token=${form.token}`;
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setStatus("❌ 系統錯誤，請重新感應卡片");
    }
  };

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>✨ NFC 靈動生日書開卡 ✨</h2>

      <form className={styles.card} onSubmit={handleSubmit}>
        {/* 姓名 */}
        <label>姓名</label>
        <input
          name="user_name"
          value={form.user_name}
          onChange={handleChange}
          placeholder="請輸入姓名"
          required
        />

        {/* 生日 */}
        <label>生日</label>
        <input name="birthday" value={form.birthday} readOnly />

        {/* 血型 */}
        <label>血型</label>
        <select
          name="blood_type"
          value={form.blood_type}
          onChange={handleChange}
        >
          <option value="">請選擇</option>
          <option value="A">A 型</option>
          <option value="B">B 型</option>
          <option value="O">O 型</option>
          <option value="AB">AB 型</option>
        </select>

        {/* 紫微提示 */}
        <p className={styles.tip}>
          🔮 若希望產生「紫微命格分析」，請同時填寫以下 [性別] 與 [出生時辰]：
        </p>

        {/* 性別 */}
        <label>性別</label>
        <select name="gender" value={form.gender} onChange={handleChange}>
          <option value="">請選擇</option>
          <option value="男">男</option>
          <option value="女">女</option>
        </select>

        {/* 出生時辰 */}
        <label>出生時辰</label>
        <select
          name="birth_time"
          value={form.birth_time}
          onChange={handleChange}
        >
          <option value="">請選擇</option>
          <option value="子">00:00~00:59（早子）</option>
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
          <option value="子">23:00~23:59（晚子）</option>
        </select>

        {/* 興趣嗜好 */}
        <label>興趣嗜好</label>
        <input
          name="hobbies"
          value={form.hobbies}
          onChange={handleChange}
          placeholder="例如：Music / Travel"
        />

        <button type="submit" className={styles.button}>
          送出開卡 ✨
        </button>
      </form>

      {/* 狀態區塊 */}
      {status !== "idle" && (
        <div className={styles.statusBox}>
          <strong>狀態：</strong> {status}
        </div>
      )}
    </div>
  );
}
