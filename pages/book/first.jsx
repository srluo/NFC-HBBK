"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./first.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";
import { getLuckyNumber } from "@/lib/luckyNumber";  // ⬅️ 新增這行

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

          // 🟢 計算幸運數字
          let lucky = null;
          if (data.card.birthday) {
            const { masterNumber, number } = getLuckyNumber(data.card.birthday.toString());
            lucky = masterNumber
              ? `⭐ ${masterNumber}（大師數字）`
              : number;
          }

          setCard({
            ...data.card,
            lucky_number: lucky || null, // ⬅️ 將 lucky number 注入 card 狀態
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

  // 🔸 取得生日象徵資料
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

  // 🌟 今日行動建議（目前用隨機一句）
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

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.container}>
      {/* 頂部標題與ICON */}
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

      {/* 🌸 誕生象徵 */}
      <section className={styles.section}>
        <h2>🌸 生日象徵</h2>
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

      {/* ✨ 性格描述 */}
      <section className={styles.section}>
        <h2>✨ 性格描述</h2>
        <p>{symbol?.description || "資料載入中..."}</p>
      </section>

      {/* 📅 今日行動建議 */}
      <section className={styles.section}>
        <h2>📅 今日行動建議</h2>
        <p>{quote || "載入中..."}</p>
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
