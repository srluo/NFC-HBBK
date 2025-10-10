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
  const [luckyDesc, setLuckyDesc] = useState("");
  const [status, setStatus] = useState("loading");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // 抓卡片資料
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
          // 🧮 lucky_number 若無則即時計算
          let lucky = data.card.lucky_number;
          if (!lucky && data.card.birthday) {
            const { masterNumber, number } = getLuckyNumber(data.card.birthday);
            lucky = masterNumber ? `${masterNumber}（大師數字）` : `${number}`;
          }

          // 🌟 lucky number 描述
          let desc = "";
          if (lucky.includes("11")) desc = "擁有強烈直覺與靈性洞察力，象徵創造與覺醒的力量。";
          else if (lucky.includes("22")) desc = "天生的實踐者與建構者，能將理想化為現實。";
          else if (lucky.includes("33")) desc = "帶有療癒與關愛能量，象徵無私與人道精神。";
          else {
            const map = {
              1: "象徵領導與創造，勇於開拓新局。",
              2: "代表協調與感性，擅長人際互動。",
              3: "充滿靈感與表達力，帶來歡樂與創意。",
              4: "務實、穩定，重視基礎與承諾。",
              5: "熱愛自由與冒險，勇於探索未知。",
              6: "充滿愛心與責任感，重視家庭與關係。",
              7: "思考深刻，追求真理與智慧。",
              8: "擁有強大行動力與財富潛能。",
              9: "富有同理與包容，渴望助人與理想。"
            };
            desc = map[number] || "具備平衡與創造的特質。";
          }

          setLuckyDesc(desc);
          setCard({ ...data.card, lucky_number: lucky });
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

      {/* 生日象徵 */}
      <section className={styles.section}>
        <h3>🌸 生日象徵</h3>
        {symbol ? (
          <>
            <p>花：<strong>{symbol.flower}</strong> — {symbol.flower_meaning}</p>
            <p>寶石：<strong>{symbol.stone}</strong> — {symbol.stone_meaning}</p>
            <p>幸運數字：<strong>{card.lucky_number}</strong></p>
            <p style={{ color: "#555", marginTop: "0.3rem" }}>{luckyDesc}</p>
          </>
        ) : <p>資料載入中...</p>}
      </section>

      {/* AI 摘要 */}
      <section className={styles.section}>
        <h3>🤖 AI 個性摘要</h3>
        <p>{card.ai_summary || "資料載入中..."}</p>
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