// /pages/book/first.jsx — v2.0.1（幸運數字安全型態修正版・正式穩定）

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // 🚀 抓取卡片資料
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
          const hasRedisLucky = !!data.card.lucky_number;
          let lucky_number = "";
          let lucky_desc = "";

          // 🎯 確保 lucky_number 為字串
          if (hasRedisLucky) {
            lucky_number = String(data.card.lucky_number);
          } else {
            const { number, masterNumber } = getLuckyNumber(String(data.card.birthday));
            lucky_number = masterNumber
              ? String(masterNumber) + "（大師數字）"
              : String(number);
          }

          // 🎯 幸運數字描述對照表
          const descMap = {
            1: "象徵領導與創造，勇於開拓新局。",
            2: "代表協調與感應，擅長人際互動。",
            3: "充滿靈感與表達力，帶來歡樂與創意。",
            4: "實事求是，重視穩定與秩序。",
            5: "熱愛自由，勇於探索新體驗。",
            6: "充滿愛心與責任感，重視家庭與人際關係。",
            7: "思考深入，追求真理與智慧。",
            8: "擁有強大行動力與影響力。",
            9: "富有同理與包容，渴望助人與理想。",
          };

          // ✅ 一律以字串比對，避免 type error
          if (lucky_number.includes("11")) {
            lucky_desc = "擁有強烈的直覺與靈性洞察力，能在變化中保持清晰與洞見。";
          } else if (lucky_number.includes("22")) {
            lucky_desc = "天生的實踐者與建構者，能將理想化為現實，展現堅毅與智慧。";
          } else if (lucky_number.includes("33")) {
            lucky_desc = "具備療癒與啟發能量，象徵無私與人道精神。";
          } else {
            const num = parseInt(lucky_number);
            lucky_desc =
              descMap[num] ||
              "具備平衡與創造的特質，能在變化中找到自我節奏。";
          }

          setCard({
            ...data.card,
            lucky_number,
            lucky_desc,
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

  // 🌸 抓取生日象徵
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

  // ☀️ 抓取每日建議
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
      {/* 🪪 Header */}
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
            <p>誕生花：<strong>{symbol.flower}</strong> — {symbol.flower_meaning}</p>
            <p>誕生石：<strong>{symbol.stone}</strong> — {symbol.stone_meaning}</p>
            <p>幸運數字：<strong>{card.lucky_number}</strong> — {card.lucky_desc}</p>
          </>
        ) : (
          <p>資料載入中...</p>
        )}
      </section>

      {/* 🤖 AI 摘要 */}
      <section className={styles.section}>
        <h3>🤖 AI 個性摘要</h3>
        {card.ai_summary_paragraphs
        ? card.ai_summary_paragraphs.map((p, i) => <p key={i}>{p}</p>)
        : <p>資料載入中...</p>}
      </section>

      {/* ☀️ 今日建議 */}
      <section className={styles.section}>
        <h3>☀️ 今日行動建議</h3>
        <p>{quote || "載入中..."}</p>
      </section>

      {/* 🎁 點數提示 */}
      <div className={styles.walletBox}>
        🎉 恭喜獲得 <strong>{card.points}</strong> 點探索點數！
      </div>

      {/* 🔙 Footer */}
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
