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
    if (typeof window === "undefined") return;

    const fetchCardData = async (t) => {
      try {
        const res = await fetch(`/api/getCard?token=${t}`);
        const data = await res.json();

        if (data.error?.includes("timeout")) {
          setStatus("⚠️ Token 已過期，請重新感應生日卡");
          return;
        }

        if (!res.ok || data.error) {
          setStatus(`❌ ${data.error || "讀取失敗"}`);
          return;
        }

        if (data.is_first_open) {
          router.replace(`/book/first?token=${t}`);
          return;
        }

        setCard(data.card);
        setStatus("ok");
      } catch (err) {
        console.error(err);
        setStatus("❌ 系統錯誤");
      }
    };

    const params = new URLSearchParams(window.location.search);
    let t = params.get("token");

    if (!t) {
      setTimeout(() => {
        const retry = new URLSearchParams(window.location.search).get("token");
        if (retry) {
          setToken(retry);
          fetchCardData(retry);
        } else {
          setStatus("❌ 缺少 token 參數");
        }
      }, 300);
    } else {
      setToken(t);
      fetchCardData(t);
    }
  }, [router]);

  if (status === "loading") return <p className={styles.text}>⏳ 載入中...</p>;
  if (status !== "ok")
    return (
      <div className={styles.errorBox}>
        <p className={styles.error}>{status}</p>
        <p className={styles.tip}>請重新感應生日卡 📱</p>
      </div>
    );

  return (
    <div className={styles.container}>
      <div className={styles.pageContent}>
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
          <h2 className={styles.title}>{card.user_name || "未命名"}</h2>
          <p className={styles.text}>{card.birthday}</p>
          <button
            className={styles.expandBtn}
            onClick={() => router.push(`/book/first?token=${token}`)}
          >
            📖 展開完整生日書
          </button>
        </div>

        <div className={styles.walletBox}>
          <p className={styles.text}>
            目前點數：<strong>{card.points}</strong>
          </p>
        </div>

        <div className={styles.menuBox}>
          <button className={styles.menuBtn}>🔮 占卜</button>
          <button className={styles.menuBtn}>🌠 紫微流年</button>
          <button className={styles.menuBtn}>🧠 MBTI 測驗</button>
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.shareButtons}>
          <button
            className={`${styles.shareBtn} ${styles.buyBtn}`}
            onClick={() => window.open("https://nfctogo.com/birthdaybook", "_blank")}
          >
            🛍️ 購買生日卡
          </button>
          <button
            className={`${styles.shareBtn} ${styles.siteBtn}`}
            onClick={() => window.open("https://nfctogo.com", "_blank")}
          >
            🌐 前往 NFCTOGO 官網
          </button>
        </div>
        <p className={styles.footerText}>
          ©2025 NFC靈動生日書 · Powered by{" "}
          <a href="https://nfctogo.com" target="_blank" rel="noreferrer">
            NFCTOGO
          </a>
        </p>
      </footer>
    </div>
  );
}
