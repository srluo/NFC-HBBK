"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./first.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";
import { getLuckyNumber } from "@/lib/luckyNumber";

export default function FirstBookPage() {
  const [card, setCard] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [quote, setQuote] = useState("");
  const [status, setStatus] = useState("loading");
  const [aiSummary, setAiSummary] = useState(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  // 🟡 讀取卡片資料
  useEffect(() => {
    if (!token) {
      setStatus("❌ 缺少 token，請重新感應生日卡");
      return;
    }

    async function fetchCard() {
      try {
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();

        if (data.error?.includes("timeout")) {
          setStatus("⚠️ Token 已過期，請重新感應生日卡");
          return;
        }

        if (!res.ok || data.error) {
          setStatus(`❌ ${data.error || "讀取失敗"}`);
          return;
        }

        const c = data.card;

        // 🧮 計算幸運數字
        const { masterNumber, number } = getLuckyNumber(c.birthday || "");
        c.lucky_number = masterNumber ? `⭐ ${masterNumber}（大師數字）` : number;

        setCard(c);
        setStatus("ok");
      } catch (err) {
        console.error(err);
        setStatus("❌ 系統錯誤");
      }
    }

    fetchCard();
  }, [token]);

  // 🌸 誕生象徵
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

  // 📅 今日行動建議
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

  // 🤖 AI Summary （僅首次產生）
  useEffect(() => {
    if (!card || card.opened === "true") return;
    async function fetchSummary() {
      try {
        const res = await fetch("/api/aiSummary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok && data.summary) {
          setAiSummary(data.summary);
        }
      } catch (err) {
        console.error("AI summary error:", err);
      }
    }
    fetchSummary();
  }, [card, token]);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok")
    return (
      <div className={styles.errorBox}>
        <p className={styles.error}>{status}</p>
        <p className={styles.tip}>請重新感應生日卡 📱</p>
      </div>
    );

  return (
    <div className={styles.container}>
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
        <h1 className={styles.title}>{card.user_name || "你的生日書"}</h1>
        <p className={styles.subtitle}>
          {card.birthday} ｜ {card.constellation}座 · {card.zodiac}
        </p>
      </header>

      <section className={styles.section}>
        <h3>🌸 生日象徵</h3>
        {symbol ? (
          <div>
            <p>
              {symbol.symbol} <strong>{symbol.flower}</strong>：{symbol.flower_meaning}
            </p>
            <p>
              💎 <strong>{symbol.stone}</strong>：{symbol.stone_meaning}
            </p>
            <p>
              🔢 <strong>幸運數字：</strong>
              {card.lucky_number || "計算中"}
            </p>
          </div>
        ) : (
          <p>資料載入中...</p>
        )}
      </section>

      <section className={styles.section}>
        <h3>✨ 性格描述</h3>
        <p>{aiSummary || symbol?.description || "生成中..."}</p>
      </section>

      <section className={styles.section}>
        <h3>📅 今日行動建議</h3>
        <p>{quote || "載入中..."}</p>
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