"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./first.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";

// 幸運數字（Master Number 模式）
function calcLuckyNumber(dateStr) {
  const digits = dateStr.split("").map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split("").map(Number).reduce((a, b) => a + b, 0);
  }
  return sum;
}

export default function FirstBookPage() {
  const [card, setCard] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [status, setStatus] = useState("loading");
  const [symbolStatus, setSymbolStatus] = useState("loading");

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    console.log("[first.jsx] token =", token);
    if (!token) {
      setStatus("❌ 缺少 token");
      return;
    }

    async function fetchCard() {
      try {
        console.log("[first.jsx] Fetching card...");
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();
        console.log("[first.jsx] getCard response:", data);
        if (res.ok && !data.error) {
          setCard(data.card);
          setStatus("ok");
        } else {
          setStatus(`❌ ${data.error || "讀取失敗"}`);
        }
      } catch (err) {
        console.error("[first.jsx] getCard error:", err);
        setStatus("❌ 系統錯誤");
      }
    }

    fetchCard();
  }, [token]);

  useEffect(() => {
    if (card?.birthday) {
      console.log("[first.jsx] card.birthday =", card.birthday, typeof card.birthday);
      const month = parseInt(card.birthday.slice(4, 6), 10);
      console.log("[first.jsx] month =", month);
      fetch(`/api/symbols?month=${month}`)
        .then((res) => {
          console.log("[first.jsx] /api/symbols status =", res.status);
          return res.json();
        })
        .then((data) => {
          console.log("[first.jsx] symbols API response =", data);
          if (data.error) setSymbolStatus("error");
          else {
            setSymbol(data);
            setSymbolStatus("ok");
          }
        })
        .catch((e) => {
          console.error("[first.jsx] symbol fetch error:", e);
          setSymbolStatus("error");
        });
    } else {
      console.warn("[first.jsx] birthday is missing or invalid in card", card);
    }
  }, [card]);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.container}>
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

      <section className={styles.section}>
        <h2>🌸 生日象徵</h2>
        {symbolStatus === "loading" && <p>資料載入中...</p>}
        {symbolStatus === "error" && <p>❌ 象徵資料載入失敗</p>}
        {symbolStatus === "ok" && (
          <>
            <p>{symbol.symbol} <strong>{symbol.flower}</strong>（{symbol.flower_meaning}）</p>
            <p>💎 <strong>{symbol.stone}</strong>（{symbol.stone_meaning}）</p>
            <p>🔢 幸運數字：<strong>{calcLuckyNumber(card.birthday)}</strong></p>
          </>
        )}
      </section>

      <div className={styles.walletBox}>
        <p>🎉 恭喜獲得 <strong>{card.points}</strong> 點探索點數！</p>
      </div>

      <button className={styles.backBtn} onClick={() => router.push(`/book?token=${token}`)}>
        返回卡片主頁
      </button>
    </div>
  );
}