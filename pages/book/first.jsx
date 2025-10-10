// /pages/book/first.jsx — v1.8.0 智慧開卡封存 + AI fallback 版
"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./book.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";
import { getLuckyNumber } from "@/lib/luckyNumber";

export default function FirstBookPage() {
  const [card, setCard] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [quote, setQuote] = useState("");
  const [status, setStatus] = useState("loading");
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // 讀取卡片資料
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
          let lucky = null;
          if (data.card.birthday) {
            const { masterNumber, number } = getLuckyNumber(
              data.card.birthday.replace(/-/g, "")
            );
            lucky = masterNumber
              ? `⭐ ${masterNumber}（大師數字）`
              : number || "";
          }
          setCard({ ...data.card, lucky_number: lucky });
          setAiText(data.card.ai_summary || "");
          setStatus("ok");
        } else {
          setStatus(`❌ ${data.error || "讀取失敗"}`);
        }
      } catch (err) {
        console.error(err);
        setStatus("❌ 系統錯誤，請重新感應生日卡 📱");
      }
    }

    fetchCard();
  }, [token]);

  // 顯示 AI loading 狀態 + fallback 保底
  useEffect(() => {
    if (status !== "ok") return;
    if (!aiText) {
      setAiLoading(true);
      const timer = setTimeout(() => {
        setAiText(
          "這樣的你，兼具感性與理性，懂得在變化中保持平衡。你的內在蘊藏著穩定的力量，能以柔和的方式影響他人，讓世界更和諧。"
        );
        setAiLoading(false);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [aiText, status]);

  // 生日象徵
  useEffect(() => {
    if (!card?.birthday) return;
    const month = parseInt(card.birthday.toString().slice(4, 6), 10);
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

  // 每日建議
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

  if (status === "loading")
    return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.iconBox}>
          <img
            src={`/icons/constellation/${
              constellationMap[card.constellation] || "default"
            }.png`}
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

      {/* 生日象徵 */}
      <section className={styles.section}>
        <h3>🌸 生日象徵</h3>
        {symbol ? (
          <>
            <p>
              花：<strong>{symbol.flower}</strong> — {symbol.flower_meaning}
            </p>
            <p>
              寶石：<strong>{symbol.stone}</strong> — {symbol.stone_meaning}
            </p>
            <p>
              幸運數字：<strong>{card.lucky_number}</strong>
            </p>
          </>
        ) : (
          <p>資料載入中...</p>
        )}
      </section>

      {/* AI 個性摘要 */}
      <section className={styles.section}>
        <h3>🤖 AI 個性摘要</h3>
        {aiLoading ? (
          <p>✨ AI 正在準備您的專屬摘要，請稍候...</p>
        ) : (
          <p>{aiText}</p>
        )}
      </section>

      {/* 行動建議 */}
      <section className={styles.section}>
        <h3>☀️ 今日行動建議</h3>
        <p>{quote || "載入中..."}</p>
      </section>

      {/* 點數提示 */}
      <div className={styles.walletBox}>
        🎉 恭喜獲得 <strong>{card.points}</strong> 點探索點數！
      </div>

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