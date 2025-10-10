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
          const { masterNumber, number } = getLuckyNumber(data.card.birthday || "");
          setCard({
            ...data.card,
            lucky_number: masterNumber ? `⭐ ${masterNumber}（大師數字）` : number,
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

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.pageContainer}>
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
        <h1 className={styles.userName}>{card.user_name || "你的生日書"}</h1>
        <p>{card.birthday} ｜ {card.constellation}座 · {card.zodiac}</p>
      </header>

      <section className={styles.section}>
        <h3>🌸 生日象徵</h3>
        <p>💎 幸運數字：<strong>{card.lucky_number || "計算中"}</strong></p>
      </section>

      <section className={styles.section}>
        <h3>✨ 性格描述</h3>
        <p>{symbol?.description || "AI 分析載入中..."}</p>
      </section>

      <section className={styles.section}>
        <h3>📅 今日行動建議</h3>
        <p>{quote || "載入中..."}</p>
      </section>

      <div className={styles.walletBox}>
        <p>🎉 恭喜獲得 <strong>{card.points}</strong> 點探索點數！</p>
      </div>

      <footer className={styles.footer}>
        <p>✨ 專屬 NFC 生日書由 <a href="https://nfctogo.com" target="_blank" rel="noreferrer">NFCTOGO.com</a> 提供</p>
        <button className={styles.backBtn} onClick={() => router.push(`/book?token=${token}`)}>
          返回主頁
        </button>
      </footer>
    </div>
  );
}