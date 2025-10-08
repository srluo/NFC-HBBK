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
  const [errorMsg, setErrorMsg] = useState("");

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // 🟡 1. 取得卡片資料
  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMsg("❌ 缺少 token，請重新感應生日卡");
      setTimeout(() => router.replace("/"), 3000);
      return;
    }

    async function fetchCard() {
      try {
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();
        if (res.ok && data.card) {
          const { masterNumber, number } = getLuckyNumber(data.card.birthday.toString());
          const lucky = masterNumber ? `⭐ ${masterNumber}（大師數字）` : number;
          setCard({ ...data.card, lucky_number: lucky });
          setStatus("ok");
        } else {
          setStatus("error");
          setErrorMsg(`❌ ${data.error || "讀取失敗，請重新感應卡片"}`);
        }
      } catch (err) {
        console.error(err);
        setStatus("error");
        setErrorMsg("❌ 系統錯誤，請重新感應卡片");
      }
    }

    fetchCard();
  }, [token, router]);

  // 🟢 2. 讀取生日象徵資料
  useEffect(() => {
    if (!card) return;
    const month = parseInt(card.birthday.toString().slice(4, 6), 10);
    fetch(`/api/symbols?month=${month}`)
      .then((res) => res.json())
      .then(setSymbol)
      .catch(console.error);
  }, [card]);

  // 🔮 3. 每日行動建議
  useEffect(() => {
    if (!card) return;
    const seed = encodeURIComponent(`${card.constellation}-${card.zodiac}`);
    fetch(`/api/dailyQuote?seed=${seed}`)
      .then((res) => res.json())
      .then((data) => setQuote(data.quote))
      .catch(console.error);
  }, [card]);

  // 🔸 狀態
  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status === "error") {
    return (
      <div className={styles.errorBox}>
        <p className={styles.error}>{errorMsg}</p>
        <p className={styles.tip}>請重新感應您的生日卡 📱</p>
      </div>
    );
  }

  // ✅ 主畫面
  return (
    <div className={styles.container}>
      <div className={styles.pageContent}>
        {/* 卡片頭 */}
        <div className={styles.cardHeader}>
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
          <h2>{card.user_name || "你的生日書"}</h2>
          <p>{card.birthday} ｜ {card.constellation}座 · {card.zodiac}</p>
        </div>

        {/* 🌸 生日象徵 */}
        <div className={styles.walletBox}>
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
        </div>

        {/* 🤖 AI 摘要 */}
        <div className={styles.walletBox}>
          <h3>🔮 AI 個性摘要</h3>
          <p>{card.ai_summary || symbol?.description || "資料生成中..."}</p>
        </div>

        {/* ☀️ 行動建議 */}
        <div className={styles.walletBox}>
          <h3>🌞 今日行動建議</h3>
          <p>{quote || "祝你有美好的一天！"}</p>
        </div>

        {/* 🎁 點數 */}
        <div className={styles.walletBox}>
          <p>🎉 恭喜獲得 <strong>{card.points}</strong> 點探索點數！</p>
        </div>

        {/* 返回主頁 */}
        <button className={styles.expandBtn} onClick={() => router.push(`/book?token=${token}`)}>
          返回生日卡主頁
        </button>
      </div>

      {/* Footer 一致化 */}
      <footer className={styles.footer}>
        <div className={styles.shareButtons}>
          <button
            className={`${styles.shareBtn} ${styles.buyBtn}`}
            onClick={() => window.open("https://www.nfctogo.com/birthdaybook", "_blank")}
          >
            🛍️ 購買生日卡
          </button>
          <button
            className={`${styles.shareBtn} ${styles.siteBtn}`}
            onClick={() => window.open("https://www.nfctogo.com", "_blank")}
          >
            🌐 前往 NFCTOGO 官網
          </button>
        </div>
        <p>©2025 NFC靈動生日書 · Powered by <a href="https://lin.ee/Uh4T1Ip" target="_blank">NFCTOGO</a></p>
      </footer>
    </div>
  );
}
