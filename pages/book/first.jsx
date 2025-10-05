"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./first.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";

export default function FirstBookPage() {
  const [card, setCard] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [status, setStatus] = useState("loading");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("❌ 缺少 token");
      return;
    }

    async function fetchData() {
      try {
        // 1️⃣ 先抓卡片資料
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();
        if (res.ok && !data.error) {
          setCard(data.card);

          // 2️⃣ 根據生日取出月份，載入 symbols.json
          const month = Number(data.card.birthday.slice(4, 6));
          const symRes = await fetch("/data/symbols.json");
          const symData = await symRes.json();
          const found = symData.find((item) => item.month === month);
          setSymbol(found || null);

          setStatus("ok");
        } else {
          setStatus(`❌ ${data.error || "讀取失敗"}`);
        }
      } catch (err) {
        console.error(err);
        setStatus("❌ 系統錯誤");
      }
    }

    fetchData();
  }, [token]);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.container}>
      {/* ⭐ 頭部區塊：圖示 + 名稱 + 生日 */}
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
            <p style={{ fontSize: "1.1rem" }}>
              {symbol.symbol} {symbol.description}
            </p>
            <p>🌸 {symbol.flower}：{symbol.flower_meaning}</p>
            <p>💎 {symbol.stone}：{symbol.stone_meaning}</p>
          </div>
        ) : (
          <p>資料載入中...</p>
        )}
      </section>

      {/* ✨ 性格描述（預留） */}
      <section className={styles.section}>
        <h2>✨ 性格描述</h2>
        <p>這裡未來會放入根據生日生成的專屬性格描述。</p>
      </section>

      {/* 📅 今日行動建議（預留每日一句） */}
      <section className={styles.section}>
        <h2>📅 今日行動建議</h2>
        <p>這裡會放入每日一句智慧或行動建議。</p>
      </section>

      {/* 🎉 點數提示 */}
      <div className={styles.walletBox}>
        <p>🎉 恭喜獲得 <strong>{card.points}</strong> 點探索點數！</p>
      </div>

      {/* 返回主頁按鈕 */}
      <button className={styles.backBtn} onClick={() => router.push(`/book?token=${token}`)}>
        返回卡片主頁
      </button>
    </div>
  );
}
