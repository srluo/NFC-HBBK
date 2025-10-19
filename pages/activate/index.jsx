// /pages/activate/index.jsx — v2.2.1-stable（補填完成自動回書本）
"use client";
import { useState, useEffect } from "react";
import styles from "./activate.module.css";

export default function Activate() {
  const [status, setStatus] = useState("idle");
  const [isUpdate, setIsUpdate] = useState(false);
  const [form, setForm] = useState({
    token: "",
    user_name: "",
    gender: "",
    birthday: "",
    blood_type: "",
    hobbies: "",
    birth_time: "",
  });

  // ------------------------------------------------------------
  // 🧭 初始化：讀取 URL 參數
  // ------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("d") || "";
    const token = params.get("token") || "";
    const mode = params.get("mode") || "";
    setIsUpdate(mode === "update");
    setForm((prev) => ({ ...prev, birthday: d, token }));

    // 若為補填模式，自動載入舊資料
    if (mode === "update" && token) {
      fetch(`/api/getCard?token=${token}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.card) {
            const c = data.card;
            setForm({
              token,
              user_name: c.user_name || "",
              gender: c.gender || "",
              birthday: c.birthday || d,
              blood_type: c.blood_type || "",
              hobbies: c.hobbies || "",
              birth_time: c.birth_time || "",
            });
          }
        })
        .catch((err) => console.error("讀取舊卡資料錯誤:", err));
    }
  }, []);

  // ------------------------------------------------------------
  // ✏️ 表單輸入
  // ------------------------------------------------------------
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // ------------------------------------------------------------
  // 🚀 送出開卡／補填
  // ------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    const hasGender = !!form.gender && form.gender.trim() !== "";
    const hasTime = !!form.birth_time && form.birth_time.trim() !== "";

    // ⚠️ 檢查性別與時辰必須同時存在或同時留空
    if ((hasGender && !hasTime) || (!hasGender && hasTime)) {
      alert("性別與出生時辰必須同時填寫或同時留空。");
      return;
    }

    setStatus(isUpdate ? "⏳ 更新中..." : "⏳ 開卡中...");

    try {
      const res = await fetch("/api/card-activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mode: isUpdate ? "update" : "" }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus(`❌ 錯誤: ${data.error || "未知錯誤"}`);
        return;
      }

      if (data.ok && data.card) {
        if (isUpdate) {
          setStatus("✅ 補填完成，已贈送 20 點！正在返回生日書...");
        } else {
          setStatus("🎉 開卡成功！即將進入生日書...");
        }

        // ✅ 延遲 1.5 秒，確保 Redis 寫入完成
        setTimeout(() => {
          window.location.href = `/book?token=${form.token}`;
        }, 1500);
      } else {
        setStatus("⚠️ 未收到卡資料，請重新整理。");
      }
    } catch (err) {
      console.error("[activate] 系統錯誤：", err);
      setStatus("❌ 系統錯誤，請重新感應卡片");
    }
  };

  // ------------------------------------------------------------
  // 🧩 畫面渲染
  // ------------------------------------------------------------
  return (
    <div className={styles.page}>
      <h2 className={styles.title}>
        {isUpdate ? "✏️ 補填生日書資訊" : "✨ NFC 靈動生日書開卡 ✨"}
      </h2>

      <form className={styles.card} onSubmit={handleSubmit}>
        <label>姓名</label>
        <input
          name="user_name"
          value={form.user_name}
          onChange={handleChange}
          placeholder="請輸入姓名"
          required
        />

        <label>生日</label>
        <input name="birthday" value={form.birthday} readOnly />

        <label>血型</label>
        <select
          name="blood_type"
          value={form.blood_type}
          onChange={handleChange}
          required={!isUpdate}
        >
          <option value="">請選擇</option>
          <option value="A">A 型</option>
          <option value="B">B 型</option>
          <option value="O">O 型</option>
          <option value="AB">AB 型</option>
        </select>

        <p className={styles.tip}>
          🔮 若要開啟「紫微命格分析」，請同時填寫【性別】與【出生時辰】
        </p>

        <label>性別</label>
        <select name="gender" value={form.gender} onChange={handleChange}>
          <option value="">請選擇</option>
          <option value="男">男</option>
          <option value="女">女</option>
        </select>

        <label>出生時辰</label>
        <select name="birth_time" value={form.birth_time} onChange={handleChange}>
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

        <label>興趣嗜好</label>
        <input
          name="hobbies"
          value={form.hobbies}
          onChange={handleChange}
          placeholder="例如：Music / NFC / Reading"
        />

        <button type="submit" className={styles.button}>
          {isUpdate ? "送出補填 ✨" : "送出開卡 ✨"}
        </button>
      </form>

      {status !== "idle" && (
        <div className={styles.statusBox}>
          <strong>狀態：</strong> {status}
        </div>
      )}
    </div>
  );
}