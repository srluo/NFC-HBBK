"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import styles from "./book.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";

export default function FirstOpenBook() {
  const router = useRouter();
  const { token } = router.query;
  const [card, setCard] = useState(null);
  const [symbols, setSymbols] = useState(null);
  const [quote, setQuote] = useState("");
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!token) return;

    async function fetchCard() {
      try {
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();
        if (!res.ok || data.error) {
          setStatus(`❌ 錯誤: ${data.error || "讀取失敗"}`);
        } else {
          setCard(data.card);
          setStatus("ok");
        }
      } catch (err) {
        console.error(err);
        setStatus("❌ 系統錯誤");
      }
    }

    fetchCard();
  }, [token]);

  useEffect(() => {
    if (!card) return;
    // 載入 symbols.json
    fetch("/data/symbols.json")
      .then(res => res.json())
      .then(data => {
        const month = parseInt(card.birthday.slice(4, 6), 10);
        const symbol = data.find(item => item.month === month);
        setSymbols(symbol || null);
      });
    // 載入每日一句
    fetch("/api/dailyQuote")
      .then(res => res.json())
      .then(data => setQuote(data.quote));
  }, [card]);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* 星座 & 生肖 ICON */}
        <div className={styles.iconBox}>
          <img
            src={`/icons/constellation/${constellationMap[card.constellation] || "default"}.svg`}
            alt={card.constellation}
            className={styles.icon}
            onError={(e) => { e.target.src = "/icons/default.svg"; }}
          />
          <img
            src={`/icons/zodiac/${zodiacMap[card.zodiac] || "default"}.svg`}
            alt={card.zodiac}
            className={styles.icon}
            onError={(e) => { e.target.src = "/icons/default.svg"; }}
          />
        </div>

        <h2 className={styles.title}>🎁 {card.user_name} 的生日書</h2>
        <p className={styles.paragraph}>生日：{card.birthday}</p>
        <p className={styles.paragraph}>農曆生日：{card.lunar_birthday}</p>
        <p className={styles.paragraph}>生肖：{card.zodiac}</p>
        <p className={styles.paragraph}>星座：{card.constellation}</p>

        {/* 🌸💎🔢 象徵區 */}
        {symbols && (
          <div style={{ textAlign: "center", margin: "1rem 0" }}>
            <p>🌸 {symbols.flower}　💎 {symbols.stone}　🔢 {symbols.number}</p>
          </div>
        )}

        {/* 🎉 開卡禮訊息 */}
        <div style={{ textAlign: "center", marginTop: "1rem", marginBottom: "1rem" }}>
          <p style={{ fontSize: "1.2rem", fontWeight: "bold" }}>🎉 恭喜開卡成功！</p>
          <p>你獲得 <strong>{card.points}</strong> 點探索點數 🎈</p>
        </div>

        {/* 📜 每日一句 */}
        {quote && (
          <div style={{ textAlign: "center", marginTop: "1rem", fontStyle: "italic", color: "#555" }}>
            「{quote}」
          </div>
        )}

        {/* 按鈕 → 進入一般頁面 */}
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <button
            style={{
              padding: "10px 20px",
              background: "#333",
              color: "#fff",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => {
              router.push(`/book?token=${token}`);
            }}
          >
            進入生日書 ➡
          </button>
        </div>
      </div>
    </div>
  );
}
