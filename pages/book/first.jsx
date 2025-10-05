"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./first.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";

export default function FirstBookPage() {
  const [card, setCard] = useState(null);
  const [symbols, setSymbols] = useState(null);
  const [quote, setQuote] = useState("");
  const [status, setStatus] = useState("loading");

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("❌ 缺少 token");
      return;
    }

    async function fetchCard() {
      try {
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();
        if (res.ok && !data.error) {
          setCard(data.card);
          setStatus("ok");
        } else {
          setStatus(`❌ ${data.error || "讀取失敗"}`);
        }
      } catch (err) {
        console.error(err);
        setStatus("❌ 系統錯誤");
      }
    }

    fetchCard();
  }, [token]);

  // 🌸💎🔢 + 每日一句
  useEffect(() => {
    if (!card) return;

    // 1. symbols.json
    fetch("/data/symbols.json")
      .then((res) => res.json())
      .then((data) => {
        const month = parseInt(card.birthday.slice(5, 7), 10);
        const symbol = data.find((item) => item.month === month);
        setSymbols(symbol || null);
      })
      .catch((err) => console.error("symbols.json error", err));

    // 2. dailyQuote API
    fetch("/api/dailyQuote")
      .then((res) => res.json())
      .then((data) => setQuote(data.quote))
      .catch((err) => console.error("dailyQuote error", err));
  }, [card]);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.container}>
      {/* 大標題區塊 */}
      <header className={styles.header}>
        <div className={styles.iconBox}>
          <img
            src={`/icons/constellation/${constellationMap[card.constellation] || "default"}.svg`}
            alt={card.constellation}
            className={styles.icon}
          />
          <img
            src={`/icons/zodiac/${zodiacMap[card.zodiac] || "default"}.svg`}
            alt={card.zodiac}
            className={styles.icon}
          />
        </div>
        <h1 className={styles.title}>{card.user_name || "你的生日書"}</h1>
        <p className={styles.subtitle}>
          {card.birthday} ｜ {card.constellation}座 · {card.zodiac}
        </p>
      </header>

      {/* 生日象徵與描述 */}
      <section className={styles.section}>
        <h2>🌸 生日象徵</h2>
        {symbols ? (
          <p>
            🌸 {symbols.flower}　💎 {symbols.stone}　🔢 {symbols.number}
          </p>
        ) : (
          <p>資料載入中...</p>
        )}
      </section>

      <section className={styles.section}>
        <h2>✨ 性格描述</h2>
        <p>這裡未來會放入根據生日生成的專屬性格描述。</p>
      </section>

      <section className={styles.section}>
        <h2>📅 今日行動建議</h2>
        {quote ? <p>「{quote}」</p> : <p>載入中...</p>}
      </section>

      {/* 點數提示 */}
      <div className={styles.walletBox}>
        <p>🎉 恭喜獲得 <strong>{card.points}</strong> 點探索點數！</p>
      </div>

      {/* 返回主頁 */}
      <button className={styles.backBtn} onClick={() => router.push(`/book?token=${token}`)}>
        返回卡片主頁
      </button>
    </div>
  );
}
