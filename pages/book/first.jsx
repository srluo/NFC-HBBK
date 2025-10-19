// /pages/book/first.jsx — v2.4.0-final by Roger (2025.10.19)
// ------------------------------------------------------------
// ✅ 整合 AI Summary v4.0 + symbol 修正
// ✅ 支援 localStorage 快取
// ✅ 顯示順序：封面 → AI摘要 → 生日象徵 → 補填提示 → 點數資訊
// ------------------------------------------------------------

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./book.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";

export default function BookFirst() {
  const [card, setCard] = useState(null);
  const [status, setStatus] = useState("loading");
  const [token, setToken] = useState(null);
  const [symbol, setSymbol] = useState(null);     // ✅ 修正 symbol 未定義
  const [summary, setSummary] = useState(null);   // ✅ 新增 AI 個性摘要
  const router = useRouter();

  // ------------------------------------------------------------
  // 讀取 Token 並取得卡資料
  // ------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
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
          setCard(data.card);
          setStatus("ok");
        } else {
          setStatus(`❌ 錯誤: ${data.error || "讀取失敗"}`);
        }
      } catch {
        setStatus("❌ 系統錯誤，請重新感應生日卡 📱");
      }
    }
    fetchCard();
  }, []);

  // ------------------------------------------------------------
  // 取得生日象徵（誕生花／誕生石）
  // ------------------------------------------------------------
  useEffect(() => {
    if (!card?.birthday) return;
    const month = parseInt(String(card.birthday).slice(4, 6), 10);
    async function fetchSymbol() {
      try {
        const res = await fetch(`/api/symbols?month=${month}`);
        const data = await res.json();
        if (res.ok) setSymbol(data);
      } catch (err) {
        console.error("fetch symbols error:", err);
      }
    }
    fetchSymbol();
  }, [card]);

  // ------------------------------------------------------------
  // 取得 AI 個性摘要（含快取）
  // ------------------------------------------------------------
  useEffect(() => {
    if (!card) return;

    const todayKey = `ai-summary-${card.uid}-${new Date().toISOString().slice(0, 10)}`;
    const cached = localStorage.getItem(todayKey);
    if (cached) {
      setSummary(JSON.parse(cached).summary);
      return;
    }

    async function fetchSummary() {
      try {
        const res = await fetch("/api/ai-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: card.uid,
            gender: card.gender,
            zodiac: card.zodiac,
            constellation: card.constellation,
            blood_type: card.blood_type,
            bureau: card.bureau,
            ming_lord: card.ming_lord,
            shen_lord: card.shen_lord,
            ming_stars: card.ming_stars,
          }),
        });
        const data = await res.json();
        if (data.ok && data.summary) {
          setSummary(data.summary);
          localStorage.setItem(todayKey, JSON.stringify(data));
        }
      } catch (err) {
        console.error("AI 個性摘要錯誤:", err);
      }
    }

    fetchSummary();
  }, [card]);

  // ------------------------------------------------------------
  // 狀態檢查
  // ------------------------------------------------------------
  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  const isBasic = !card.gender || !card.birth_time;

  // ------------------------------------------------------------
  // 畫面結構
  // ------------------------------------------------------------
  return (
    <div className={styles.container}>
      {/* 封面 */}
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
      </div>

      {/* 🌸 生日象徵 */}
      <section className={styles.section}>
        <h3>🌸 生日象徵</h3>
        {symbol ? (
          <>
            <p>誕生花：<strong>{symbol.flower}</strong> — {symbol.flower_meaning}</p>
            <p>誕生石：<strong>{symbol.stone}</strong> — {symbol.stone_meaning}</p>
            <p>幸運數字：<strong>{card.lucky_number}</strong> — {card.lucky_desc}</p>
          </>
        ) : (
          <p>資料載入中...</p>
        )}
      </section>

      {/* 🧠 AI 個性摘要 */}
      {summary && (
        <section className={styles.section}>
          <h3>🧠 AI 個性摘要</h3>
          <p style={{ whiteSpace: "pre-line", marginTop: "0.5rem" }}>{summary}</p>
        </section>
      )}

      {/* 🎁 補填提示 */}
      {isBasic && (
        <section className={styles.walletBox}>
          <h3>🎁 填寫完整資訊可獲贈 <strong>20 點</strong>！</h3>
          <p style={{ marginTop: "0.3rem" }}>
            補填性別與出生時辰，開啟紫微命格分析 🔮
          </p>
          <button
            className={styles.expandBtn}
            style={{ background: "#ff9800", marginTop: "0.6rem" }}
            onClick={() =>
              router.push(`/activate?token=${token}&mode=update&d=${card.birthday}`)
            }
          >
            ✏️ 立即補填
          </button>
        </section>
      )}

      {/* 💎 點數資訊與返回主頁 */}
      <section className={styles.walletBox}>
          <h3>💎 目前點數：{card.points}</h3>
          <button
            className={styles.expandBtn}
            style={{ marginTop: "0.6rem" }}
            onClick={() => router.push(`/book?token=${token}`)}
          >
            🔙 返回生日書
          </button>
      </section>
    </div>
  );
}