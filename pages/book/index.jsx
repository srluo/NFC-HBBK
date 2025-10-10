"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./book.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";

export default function Book() {
  const [card, setCard] = useState(null);
  const [status, setStatus] = useState("loading");
  const [token, setToken] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t = urlParams.get("token");
    if (!t) {
      setStatus("❌ 缺少 token，請重新感應生日卡 📱");
      return;
    }
    setToken(t);

    async function fetchCard() {
      try {
        const res = await fetch(`/api/getCard?token=${t}`);
        const data = await res.json();
        if (res.ok && !data.error) {
          if (data.is_first_open) {
            router.replace(`/book/first?token=${t}`);
            return;
          }
          setCard(data.card);
          setStatus("ok");
        } else {
          setStatus(`❌ 錯誤: ${data.error || "讀取失敗"}`);
        }
      } catch (err) {
        console.error(err);
        setStatus("❌ 系統錯誤，請重新感應生日卡 📱");
      }
    }
    fetchCard();
  }, [router]);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.container}>
      {/* 卡片封面 */}
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

        <h2>{card.user_name || "未命名"}</h2>
        <p>{card.birthday}</p>

        <button
          className={styles.expandBtn}
          onClick={() => router.push(`/book/first?token=${token}`)}
        >
          📖 展開完整生日書
        </button>
      </div>

      {/* 錢包區 */}
      <div className={styles.walletBox}>
        <p>目前點數：<strong>{card.points}</strong></p>
      </div>

      {/* 功能選單 */}
      <div className={styles.menuBox}>
        <button>🔮 占卜</button>
        <button>🌠 紫微流年</button>
        <button>🧠 MBTI 測驗</button>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <button
          className={`${styles.footerBtn} ${styles.buyBtn}`}
          onClick={() => window.open("https://nfctogo.com/birthdaycard", "_blank")}
        >
          🎁 購買生日卡
        </button>
        <button
          className={`${styles.footerBtn} ${styles.siteBtn}`}
          onClick={() => window.open("https://nfctogo.com", "_blank")}
        >
          🌐 前往 NFCTOGO 官網
        </button>
        <p className={styles.copy}>©2025 NFC靈動生日書 · Powered by NFCTOGO</p>
      </footer>
    </div>
  );
}