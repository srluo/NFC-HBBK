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

  // ✅ 載入生日卡資料
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

  // ✅ 載入 symbols.json（靜態生日象徵資料）
  useEffect(() => {
    async function loadSymbols() {
      try {
        const res = await fetch("/data/symbols.json");
        if (!res.ok) {
          console.error("❌ symbols.json 載入失敗", res.status);
          return;
        }
        const data = await res.json();
        setSymbolData(data);
        console.log("✅ symbols.json 載入成功");
      } catch (e) {
        console.error("symbols.json 載入錯誤", e);
      }
    }
    loadSymbols();
  }, []);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  // ✅ 確保生日格式正確，再取月份
  let month = null;
  if (card && typeof card.birthday === "string") {
    // 格式：YYYYMMDD 或 YYYY-MM-DD
    const clean = card.birthday.replace(/-/g, "");
    if (clean.length >= 6) {
      month = parseInt(clean.slice(4, 6), 10);
    }
  }

  const symbol = symbolData?.find((s) => s.month === month);

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

      {/* 🌸 生日象徵 */}
      <section className={styles.section}>
        <h2>🌸 生日象徵</h2>
        {symbol ? (
          <div>
            <p>{symbol.symbol} {symbol.flower}（{symbol.flower_meaning}）</p>
            <p>💎 {symbol.stone}（{symbol.stone_meaning}）</p>
            <p>{symbol.description}</p>
          </div>
        ) : (
          <p>資料載入中...</p>
        )}
      </section>

      {/* ✨ 性格描述（未來擴充） */}
      <section className={styles.section}>
        <h2>✨ 性格描述</h2>
        <p>這裡未來會放入根據生日生成的專屬性格描述。</p>
      </section>

      {/* 📅 每日一句（暫時隨機） */}
      <section className={styles.section}>
        <h2>📅 今日行動建議</h2>
        <p>這裡會放入每日一句智慧或行動建議。</p>
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
