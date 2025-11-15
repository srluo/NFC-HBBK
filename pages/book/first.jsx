// 修正版 /pages/book/first.jsx — v2.7.0-stable

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./book.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";

export default function BookFirst() {
  const [card, setCard] = useState(null);
  const [status, setStatus] = useState("loading");
  const [token, setToken] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const router = useRouter();
  const [showMBTIEdit, setShowMBTIEdit] = useState(false);
  const [inputType, setInputType] = useState("");

  // ✅ 加入重試版 fetchCard（防 Redis 延遲）
  async function fetchCardWithRetry(token, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();
        if (res.ok && !data.error) return data.card;
        console.warn(`⚠️ fetchCard 第 ${i + 1} 次失敗: ${data.error}`);
      } catch (err) {
        console.error(`fetchCard 第 ${i + 1} 次例外:`, err);
      }
      await new Promise((r) => setTimeout(r, 500)); // 延遲再試
    }
    throw new Error("多次重試後仍失敗");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    const cached = sessionStorage.getItem("book_token");
    const exp = Number(sessionStorage.getItem("book_token_exp") || 0);

    if (!t && !cached) {
      setStatus("❌ 缺少 token，請重新感應生日卡 📱");
      return;
    }

    const tokenToUse = t || cached;

    // 🔒 Token 時效檢查
    try {
      const decoded = atob(tokenToUse);
      const parts = decoded.split(":");
      const expFromToken = parts.length >= 5 ? Number(parts[4]) : Date.now() + 600000;
      if (Date.now() > expFromToken) {
        setStatus("⚠️ Token 已逾時，請重新感應生日卡 📱");
        return;
      }

      sessionStorage.setItem("book_token", tokenToUse);
      sessionStorage.setItem("book_token_exp", expFromToken.toString());
      setToken(tokenToUse);

      // ✅ 使用重試版抓卡
      (async () => {
        try {
          const cardData = await fetchCardWithRetry(tokenToUse, 3);
          setCard(cardData);
          setStatus("ok");
        } catch {
          setStatus("⚠️ 系統忙碌中，請重新整理再試一次。");
          // 可選：自動重載
          setTimeout(() => location.reload(), 1200);
        }
      })();

    } catch (err) {
      console.error("Token 解碼錯誤:", err);
      setStatus("❌ Token 無效，請重新感應生日卡");
    }
  }, []);

  // ------------------------------------------------------------
  // 生日象徵
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

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  // ------------------------------------------------------------
  // 既有內容：AI Summary / 延伸探索 / 點數 / 返回按鈕 等全保留
  // ------------------------------------------------------------

  const isBasic = !card.gender || !card.birth_time;
  const renderAISummary = (text) => {
    if (!text) return null;
    const cleanText = text.replace(/^#+\s*/gm, "").replace(/\r/g, "").trim();
    const sections = cleanText
      .split(/\n\s*\n/)
      .filter(Boolean)
      .map((part, i) => {
        const [title, ...body] = part.split(/[:：]/);
        return (
          <div key={i} style={{ marginBottom: "1rem", lineHeight: 1.7 }}>
            <h4 style={{ color: "#222", fontWeight: "700", marginBottom: "0.3rem" }}>
              {title.trim()}：
            </h4>
            <p style={{ whiteSpace: "pre-line", marginLeft: "0.5rem" }}>
              {body.join("：").trim()}
            </p>
          </div>
        );
      });
    return sections;
  };

  return (
    <div className={styles.container}>
      {/* 🪪 封面 */}
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

      {/* 🎁 補填提示 */}
      {isBasic && (
        <section className={styles.toolBox}>
          <h3>🎁 填寫完整資訊可獲贈 <strong>20 點</strong>！</h3>
          <p style={{ marginTop: "0.3rem" }}>補填性別與出生時辰，開啟紫微命格分析 🔮</p>
          <button
            className={styles.expandBtn}
            style={{ background: "#ff9800", marginTop: "0.6rem" }}
            onClick={() => router.push(`/activate?token=${token}&mode=update&d=${card.birthday}`)}
          >
            ✏️ 立即補填
          </button>
        </section>
      )}

      {/* 🪞 人格洞察分析 */}
      {card.ai_summary && (
        <section className={styles.section}>
          <h3>🪞 人格洞察分析</h3>
          <div style={{ marginTop: "0.8rem" }}>{renderAISummary(card.ai_summary)}</div>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#666",
              marginTop: "1.2rem",
              lineHeight: 1.6,
              borderTop: "1px solid #ddd",
              paddingTop: "0.8rem",
            }}
          >
            ※ 本段分析由 NFCTOGO 智能系統生成，綜合
            <strong>生肖、星座、紫微命盤、血型與出生時間</strong>
            等多重人格向度，透過 OpenAI 模型進行語意推演。
          </p>
        </section>
      )}

      {/* 🧠 MBTI 人格特質（新版：展示 → 前往管理頁） */}
      {card.mbti_profile ? (
        <section className={styles.section}>
          <h3>🧠 MBTI 人格特質</h3>

          {/* 類型 + 圖片 */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
              marginBottom: "0.8rem",
            }}
          >
            <img
              src={`/img/MBTI/${card.mbti_profile.icon}`}
              alt={card.mbti_profile.type}
              style={{
                width: 96,
                height: 144,
                objectFit: "cover",
                background: "#f8f8f8",
                flexShrink: 0,
              }}
            />

            <div style={{ flex: 1 }}>
              <p>
                類型：
                <strong>{card.mbti_profile.type}</strong>（{card.mbti_profile.summary}）
              </p>
              <small style={{ color: "#888" }}>
                上次測驗時間：
                {new Date(card.mbti_profile.last_test_ts).toLocaleString("zh-TW")}
              </small>
            </div>
          </div>

          {/* 完整人格總覽 （三大項） */}
          <div
            style={{
              background: "#fafafa",
              borderRadius: 12,
              padding: "1rem",
              lineHeight: 1.7,
              border: "1px solid #eee",
            }}
          >
            <p>
              <strong>特質描述：</strong>
              {card.mbti_profile.overview}
            </p>

            <p style={{ marginTop: "0.8rem" }}>
              <strong>在人際與團隊中的表現：</strong>
              {card.mbti_profile.relationship}
            </p>

            <p style={{ marginTop: "0.8rem" }}>
              <strong>適合職業方向：</strong>
              {card.mbti_profile.career}
            </p>
          </div>

          {/* 前往 MBTI 管理頁 */}
          <div className={styles.menuBox} style={{ marginTop: "1rem" }}>
            <button
              className={styles.expandButton}
              onClick={() => router.push(`/book/mbti?uid=${card.uid}`)}
              style={{ background: "#007bff", color: "white" }}
            >
              ⚙️ 前往 MBTI 管理頁
            </button>
          </div>
        </section>
      ) : (
        <section className={styles.section}>
          <center><h3>🧠 MBTI 人格特質</h3>
          <p>尚未設定 MBTI 類型。</p>
          <button
            className={styles.exploreButton}
            onClick={() => router.push(`/book/mbti?uid=${card.uid}`)}
          >
            🧠 前往 MBTI 測驗工具
          </button></center>
        </section>
      )}

      {/* 💠 延伸探索 */}
      <section className={styles.section}><center>
        <h3>🌠 延伸探索</h3></center>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.8rem" }}>
          <button className={styles.exploreButton} onClick={() => router.push(`/service/fortune?uid=${card.uid}`)}>
            🔮 紫微流年解析 <span>（5點，報告）</span>
          </button>
          <button className={styles.exploreButton} onClick={() => router.push(`/service/lifepath?uid=${card.uid}`)}>
            🧭 生命靈數分析 <span>（2點，短文）</span>
          </button>
        </div>
      </section>

      {/* 💎 點數資訊 */}
      <section className={styles.toolBox}>
        <h3>💎 目前點數：{card.points}</h3>
        <button
          className={styles.expandBtn}
          style={{ background: "#ff9800", marginTop: "0.6rem" }}
          onClick={() => router.push(`/book?token=${token}`)}
        >
          🔙 返回生日書
        </button>
      </section>
    </div>
  );
}