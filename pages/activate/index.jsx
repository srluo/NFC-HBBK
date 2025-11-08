// /pages/activate/index.jsx — v2.3.1-birthdayLockNotice
"use client";
import { useState, useEffect } from "react";
import styles from "./activate.module.css";

export default function Activate() {
  const [status, setStatus] = useState("idle");
  const [isUpdate, setIsUpdate] = useState(false);
  const [isLocked, setIsLocked] = useState(false); // 🔒 是否鎖定生日
  const [isUnbound, setIsUnbound] = useState(false); // 🎯 d=00000000

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
  // 🧭 初始化：讀取 URL 參數 + 嘗試讀取既有卡資料
  // ------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("d") || "";
    const token = params.get("token") || "";
    const mode = params.get("mode") || "";
    setIsUpdate(mode === "update");

    const unbound = d === "00000000";
    setIsUnbound(unbound);
    setForm((prev) => ({ ...prev, birthday: d, token }));

    if (token) {
      fetch(`/api/getCard?token=${token}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.ok && data.card) {
            const c = data.card;
            const hasBirth = !!c.birthday && c.birthday !== "00000000";
            const alreadyActive = c.status === "ACTIVE";
            setIsLocked(hasBirth || alreadyActive);

            setForm({
              token,
              user_name: c.user_name || "",
              gender: c.gender || "",
              birthday: hasBirth ? c.birthday : d,
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
  // 🧪 基本生日格式檢查（YYYYMMDD）
  // ------------------------------------------------------------
  function isValidYYYYMMDD(x) {
    if (!/^\d{8}$/.test(x)) return false;
    const y = parseInt(x.slice(0, 4), 10);
    const m = parseInt(x.slice(4, 6), 10);
    const d = parseInt(x.slice(6, 8), 10);
    if (y < 1900 || y > 2100) return false;
    if (m < 1 || m > 12) return false;
    const mdays = [31, (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return d >= 1 && d <= mdays[m - 1];
  }

  // ------------------------------------------------------------
  // 🚀 送出開卡／補填
  // ------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLocked) {
      if (!form.birthday || form.birthday === "19990101") {
        alert("請輸入生日（YYYYMMDD）後再送出。");
        return;
      }
      if (!isValidYYYYMMDD(form.birthday)) {
        alert("生日格式需為 YYYYMMDD，請重新確認。");
        return;
      }

      // ⚠️ 一次性警示
      const confirmLock = confirm("⚠️ 生日輸入後將永久綁定，無法再修改。\n請再次確認生日是否正確。");
      if (!confirmLock) return;
    }

    const hasGender = !!form.gender && form.gender.trim() !== "";
    const hasTime = !!form.birth_time && form.birth_time.trim() !== "";

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
        setStatus(isUpdate ? "✅ 補填完成！正在返回生日書..." : "🎉 開卡成功！即將進入生日書...");
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
        <input
          name="birthday"
          value={form.birthday}
          onChange={handleChange}
          readOnly={isLocked}
          required={!isLocked}
          placeholder="YYYYMMDD"
        />
        {/* 🎯 生日提示 */}
        {!isLocked && isUnbound && (
          <p className={styles.tip} style={{ color: "#d00", fontWeight: "bold" }}>
            ⚠️ 生日輸入後將無法再更改！
          </p>
        )}
        {isLocked && (
          <p className={styles.tip} style={{ color: "#666" }}>
            🔒 此生日已綁定，無法修改。
          </p>
        )}

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