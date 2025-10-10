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

  // 🟢 Step 1. 讀卡資料
  useEffect(() => {
    if (!token) {
      setStatus("❌ 缺少 token，請重新感應卡片 📱");
      return;
    }

    async function fetchCard() {
      try {
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();

        if (res.ok && data.card) {
          // 🎯 幸運數字
          let lucky = null;
          if (data.card.birthday) {
            const { masterNumber, number } = getLuckyNumber(data.card.birthday.toString());
            lucky = masterNumber
              ? `⭐ ${masterNumber}（大師數字）`
              : number;
          }

          setCard({
            ...data.card,
            lucky_number: lucky || null,
          });

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

  // 🌸 生日象徵
  useEffect(() => {
    if (!card || !card.birthday) return;
    const birthdayStr = card.birthday.toString();
    const month = parseInt(birthdayStr.slice(4, 6), 10);

    async function fetchSymbol() {
      try {
        const res = await fetch(`/api/symbols?month=${month}`);
        const data = await res.json();
        if (res.ok && data) {
          setSymbol(data);
        }
      } catch (err) {
        console.error("fetch symbols error:", err);
      }
    }

    fetchSymbol();
  }, [card]);

  // 📅 今日建議
  useEffect(() => {
    async function fetchQuote() {
      try {
        const res = await fetch("/api/dailyQuote");
        const data = await res.json();
        if (res.ok && data.quote) {
          setQuote(data.quote);
        }
      } catch (err) {
        console.error("fetch dailyQuote error:", err);
      }
    }
    fetchQuote();
  }, []);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.pageContainer}>
      {/* Header 區域 */}
      <header className={styles.cardHeader}>
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
        <h2 className={styles.userName}>{card.user_name || "你的生日書"}</h2>
        <p>
          {card.birthday} ｜ {card.constellation}座 · {card.zodiac}
        </p>
      </header>

      {/* 🌸 生日象徵 */}
      <section className={styles.section}>
        <h3>🌸 生日象徵</h3>
        {symbol ? (
          <div className={styles.descBox}>
            <p>🌼 <strong>{symbol.flower}</strong>：{symbol.flower_meaning}</p>
            <p>💎 <strong>{symbol.stone}</strong>：{symbol.stone_meaning}</p>
            <p>🔢 <strong>幸運數字：</strong>{card.lucky_number || "計算中"}</p>
          </div>
        ) : (
          <p>資料載入中...</p>
        )}
      </section>

      {/* ✨ 性格描述 */}
      <section className={styles.section}>
        <h3>✨ 性格描述</h3>
        <p>{symbol?.description || "資料載入中..."}</p>
      </section>

      {/* 📅 今日建議 */}
      <section className={styles.section}>
        <h3>📅 今日行動建議</h3>
        <p>{quote || "載入中..."}</p>
      </section>

      {/* 🎁 點數 */}
      <div className={styles.walletBox}>
        <p>🎉 恭喜獲得 <strong>{card.points}</strong> 點探索點數！</p>
      </div>

      {/* 🔙 返回按鈕 */}
      <button className={styles.backBtn} onClick={() => router.push(`/book?token=${token}`)}>
        返回卡片主頁
      </button>

      {/* 📜 Footer 固定底部 */}
      <footer className={styles.footer}>
        © 2025 <a href="https://nfctogo.com" target="_blank">NFCTOGO</a> · NFC 生日書
      </footer>
    </div>
  );
}