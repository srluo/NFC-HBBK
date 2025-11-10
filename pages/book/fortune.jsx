// /pages/book/fortune.jsx — v3.7 (LocalStorage Cached Display)
"use client";
import { useEffect, useState } from "react";
import styles from "./book.module.css";

/**
 * 🌟 NFC BirthdayBook — Fortune Result Page
 * ------------------------------------------------------------
 * ✅ 若 localStorage 有當日結果 → 直接顯示，不再呼叫 API
 * ✅ 若無快取 → 呼叫 /api/fortune-draw 生成並緩存
 * ✅ 自動記錄到 localStorage 與 sessionStorage
 * ------------------------------------------------------------
 * Ver: 3.7 ｜ 2025.11.10
 */

export default function Fortune() {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("loading");
  const [uid, setUid] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem("book_token");
    const cardCache = sessionStorage.getItem("book_card_cache");
    if (!token || !cardCache) {
      setStatus("⚠️ Session 過期，請重新感應卡片 📱");
      return;
    }

    try {
      const card = JSON.parse(cardCache);
      setUid(card.uid);
      const todayKey = `fortune-result-${card.uid}-${new Date().toISOString().slice(0, 10)}`;
      const cached = localStorage.getItem(todayKey);

      if (cached) {
        const data = JSON.parse(cached);
        setResult(data);
        setStatus("ok");
        return;
      }

      // 若無快取 → 重新生成
      fetchFortune(token, card, todayKey);
    } catch {
      setStatus("❌ 讀取錯誤，請重新感應卡片");
    }
  }, []);

  // ------------------------------------------------------------
  // 呼叫 API 生成新運勢
  // ------------------------------------------------------------
  async function fetchFortune(token, card, todayKey) {
    try {
      const res = await fetch(`/api/fortune-draw?token=${token}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setStatus("❌ " + (data.error || "生成失敗"));
        return;
      }

      const resultObj = {
        sign: data.sign,
        blood: data.blood,
        summary: data.summary,
        suggestion: data.suggestion,
        date: new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" }),
      };

      // ✅ 寫入 localStorage 快取
      localStorage.setItem(todayKey, JSON.stringify(resultObj));
      // ✅ sessionStorage for quick recall
      sessionStorage.setItem("lastFortune", JSON.stringify(resultObj));

      setResult(resultObj);
      setStatus("ok");
    } catch (err) {
      console.error("[fortune.jsx] error:", err);
      setStatus("❌ 系統錯誤");
    }
  }

  // ------------------------------------------------------------
  // 畫面呈現
  // ------------------------------------------------------------
  if (status === "loading") return <p className={styles.loading}>🔮 正在解析你的今日運勢...</p>;
  if (status !== "ok") {
    return (
      <div className={styles.container}>
        <h3>{status}</h3>
        <button className={styles.expandBtn}
          onClick={() => (window.location.href = "https://nfc-hbbk.vercel.app/")}
        >🔄 重新感應生日卡</button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className={styles.container}>
      <section className={styles.walletBox}>
        <h2>🌟 今日運勢</h2>
        <p className={styles.sub}>
          星座：<b>{result.sign}</b> ｜ 血型：<b>{result.blood}</b>
        </p>
        <hr />
        <p><b>🌞 今日整體運勢：</b></p>
        <p>{result.summary}</p>
        <hr />
        <p><b>💡 行動建議：</b></p>
        <p>{result.suggestion}</p>
      </section>

      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <button className={styles.expandBtn} onClick={() => window.history.back()}>
          ⬅️ 返回生日書
        </button>
        <button className={styles.expandBtn}
          style={{ background: "#5c9eff", marginLeft: "0.5rem" }}
          onClick={() => window.open("https://www.nfctogo.com", "_blank")}
        >
          🌐 前往 NFCTOGO 官網
        </button>
      </div>

      <footer className={styles.footer}>
        <p className={styles.copy}>©2025 NFC靈動生日書 · Powered by NFCTOGO</p>
      </footer>
    </div>
  );
}