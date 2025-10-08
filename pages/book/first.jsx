"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./book.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";
import { getLuckyNumber } from "../../lib/luckyNumber";

export default function FirstBookPage() {
  const [card, setCard] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [quote, setQuote] = useState("");
  const [status, setStatus] = useState("loading");

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // 🟡 第一步：抓卡片資料
  useEffect(() => {
    if (!token) {
      setStatus("❌ 缺少 token");
      return;
    }

    async function fetchCard() {
      console.log("[first.jsx] Fetching card...");
      try {
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();
        if (res.ok && data.card) {
          console.log("[first.jsx] getCard response:", data);

          // 🧮 計算幸運數字
          let lucky = null;
          if (data.card.birthday) {
            const { masterNumber, number } = getLuckyNumber(data.card.birthday.toString());
            lucky = masterNumber ? `⭐ ${masterNumber}（大師數字）` : number;
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

  // 🌸 第二步：讀取生日象徵資料
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

  // 🌞 第三步：每日建議（seed 化）
  useEffect(() => {
    if (!card) return;
    async function fetchQuote() {
      try {
        const seed = encodeURIComponent(`${card.constellation}-${card.zodiac}`);
        const res = await fetch(`/api/dailyQuote?seed=${seed}`);
        const data = await res.json();
        if (res.ok && data.quote) {
          setQuote(data.quote);
        }
      } catch (err) {
        console.error("fetch dailyQuote error:", err);
      }
    }

    fetchQuote();
  }, [card]);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.container}>
      {/* 頂部標題與 ICON */}
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
        <h1 className={styles.bigTitle}>{card.user_name || "你的生日書"}</h1>
        <p className={styles.paragraph}>
          {card.birthday} ｜ {card.constellation} · {card.zodiac}
        </p>
      </header>

      {/* 🌸 誕生象徵 */}
      <section className={styles.descBox}>
        <h3>🌸 生日象徵</h3>
        {symbol ? (
          <>
            <p>花：<strong>{symbol.flower}</strong> — {symbol.flower_meaning}</p>
            <p>寶石：<strong>{symbol.stone}</strong> — {symbol.stone_meaning}</p>
            <p>幸運數字：<strong>{card.lucky_number}</strong></p>
          </>
        ) : (
          <p>載入中...</p>
        )}
      </section>

      {/* 🔮 AI 性格摘要 */}
      <section className={styles.descBox}>
        <h3>🔮 AI 個性摘要</h3>
        <p>{card.ai_summary || symbol?.description || "正在生成..."}</p>
      </section>

      {/* 🌞 今日行動建議 */}
      <section className={styles.descBox}>
        <h3>🌞 今日行動建議</h3>
        <p>{quote || "祝你有美好的一天！"}</p>
      </section>

      {/* 🎁 點數資訊 */}
      <div className={styles.walletBox}>
        <p>🎉 恭喜獲得 <strong>{card.points}</strong> 點探索點數！</p>
      </div>

      {/* 🔙 返回主頁 */}
      <button className={styles.expandBtn} onClick={() => router.push(`/book?token=${token}`)}>
        返回生日卡主頁
      </button>
    </div>
  );
}
