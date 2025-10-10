// /pages/book/first.jsx — v2.0.1（Lucky Number + AI Paragraph）
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./book.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";

export default function FirstBookPage() {
  const [card, setCard] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [quote, setQuote] = useState("");
  const [status, setStatus] = useState("loading");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // 🧭 取得卡片資料
  useEffect(() => {
    if (!token) {
      setStatus("❌ 缺少 token，請重新感應生日卡 📱");
      return;
    }

    async function fetchCard() {
      try {
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();

        if (res.ok && data.card) {
          // ✅ 直接使用 Redis 內 lucky_number / lucky_desc
          setCard({
            ...data.card,
            lucky_number: data.card.lucky_number || "",
            lucky_desc: data.card.lucky_desc || "",
            ai_summary_paragraphs: data.card.ai_summary_paragraphs
              ? JSON.parse(data.card.ai_summary_paragraphs)
              : null,
          });
          setStatus("ok");
        } else {
          setStatus(`❌ ${data.error || "讀取失敗"}`);
        }
      } catch (err) {
        console.error("fetchCard error:", err);
        setStatus("❌ 系統錯誤，請重新感應生日卡 📱");
      }
    }

    fetchCard();
  }, [token]);

  // 🌸 生日象徵
  useEffect(() => {
    if (!card?.birthday) return;
    const month = parseInt(String(card.birthday).slice(4, 6), 10);
    async function fetchSymbol() {
      try {
        const res = await fetch(`/api/symbols?month=${month}`);
        const data = await res.json();
        if (res.ok) setSymbol(data);
      } catch (err) {
        console.error("fetch symbols error:", err);
      }
    }
    fetchSymbol();
  }, [card]);

  // ☀️ 每日建議
  useEffect(() => {
    async function fetchQuote() {
      try {
        const res = await fetch("/api/dailyQuote");
        const data = await res.json();
        if (res.ok) setQuote(data.quote);
      } catch (err) {
        console.error("fetch dailyQuote error:", err);
      }
    }
    fetchQuote();
  }, []);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.iconBox}>
          <img
            src={`/icons/constellation/${constellationMap[card.constellation] || "default"}.png`}
            alt={card.constellation}
            className={styles.icon}
          />
          <img
            src={`/icons/zodiac/${zodiacMap[card.zodiac] || "default"}.png`}
            alt={card.zodiac}
            className={styles.icon}
          />
        </div>
        <h1 className={styles.title}>{card.user_name}</h1>
        <p className={styles.subtitle}>
          {card.birthday} ｜ {card.constellation} · {card.zodiac}
        </p>
      </header>

      {/* 🌸 生日象徵 */}
      <section className={styles.section}>
        <h3>🌸 生日象徵</h3>
        {symbol ? (
          <>
            <p>
              誕生花：<strong>{symbol.flower}</strong> — {symbol.flower_meaning}
            </p>
            <p>
              誕生石：<strong>{symbol.stone}</strong> — {symbol.stone_meaning}
            </p>
            <p>
              幸運數字：<strong>{card.lucky_number}</strong> — {card.lucky_desc}
            </p>
          </>
        ) : (
          <p>資料載入中...</p>
        )}
      </section>

      {/* 🤖 AI 個性摘要 */}
      <section className={styles.section}>
        <h3>🤖 AI 個性摘要</h3>
        {card.ai_summary_paragraphs ? (
          card.ai_summary_paragraphs.map((p, i) => (
            <p
              key={i}
              className={styles.fadeInParagraph}
              style={{ animationDelay: `${i * 0.3}s` }}
            >
              {p}
            </p>
          ))
        ) : card.ai_summary ? (
          // fallback：舊版兼容（若無 paragraphs）
          card.ai_summary.split(/(?<=。)\s*/g).map((p, i) => (
            <p key={i} className={styles.fadeInParagraph}>
              {p.trim()}
            </p>
          ))
        ) : (
          <p>資料載入中...</p>
        )}
      </section>

      {/* ☀️ 今日行動建議 */}
      <section className={styles.section}>
        <h3>☀️ 今日行動建議</h3>
        <p>{quote || "載入中..."}</p>
      </section>

      {/* 點數提示 */}
      <div className={styles.walletBox}>
        🎉 恭喜獲得 <strong>{card.points}</strong> 點探索點數！
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <button
          className={`${styles.footerBtn} ${styles.backBtn}`}
          onClick={() => router.push(`/book?token=${token}`)}
        >
          返回生日卡主頁
        </button>
      </footer>
    </div>
  );
}
