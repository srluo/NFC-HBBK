"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./first.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";

export default function FirstBookPage() {
  const [card, setCard] = useState(null);
  const [status, setStatus] = useState("loading");
  const [symbolData, setSymbolData] = useState(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

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
        console.log("[first.jsx] getCard response:", data);
        if (res.ok && !data.error) {
          // ✅ birthday 型別統一處理
          if (data.card.birthday && typeof data.card.birthday === "number") {
            data.card.birthday = String(data.card.birthday);
          }
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

  // 🎯 載入 symbols.json 並依照月份抓對應象徵資料
  useEffect(() => {
    if (!card || !card.birthday) return;

    const birthdayStr = card.birthday.toString();
    if (birthdayStr.length !== 8) {
      console.warn("[first.jsx] birthday is missing or invalid in card", card);
      return;
    }

    const month = Number(birthdayStr.slice(4, 6));
    console.log("[first.jsx] month =", month);

    async function fetchSymbols() {
      try {
        const res = await fetch(`/api/symbols`);
        const data = await res.json();
        const found = data.find((item) => item.month === month);
        console.log("[first.jsx] symbolData found:", found);
        setSymbolData(found || null);
      } catch (err) {
        console.error("[first.jsx] symbols fetch error:", err);
      }
    }

    fetchSymbols();
  }, [card]);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.container}>
      {/* Header 區塊 */}
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

      {/* 🌸 生日象徵區 */}
      <section className={styles.section}>
        <h2>🌸 生日象徵</h2>
        {!symbolData ? (
          <p>資料載入中...</p>
        ) : (
          <>
            <p>
              {symbolData.symbol} {symbolData.flower}（{symbolData.flower_meaning}）
            </p>
            <p>
              💎 {symbolData.stone}（{symbolData.stone_meaning}）
            </p>
            <p>{symbolData.description}</p>
          </>
        )}
      </section>

      {/* ✨ 性格描述（未來擴充） */}
      <section className={styles.section}>
        <h2>✨ 性格描述</h2>
        <p>這裡未來會放入根據生日生成的專屬性格描述。</p>
      </section>

      {/* 📅 每日一句（未來擴充） */}
      <section className={styles.section}>
        <h2>📅 今日行動建議</h2>
        <p>這裡會放入每日一句智慧或行動建議。</p>
      </section>

      {/* 🎉 點數提示 */}
      <div className={styles.walletBox}>
        <p>🎉 恭喜獲得 <strong>{card.points}</strong> 點探索點數！</p>
      </div>

      {/* 🔙 返回主頁 */}
      <button className={styles.backBtn} onClick={() => router.push(`/book?token=${token}`)}>
        返回卡片主頁
      </button>
    </div>
  );
}
