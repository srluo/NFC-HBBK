// /pages/book/first.jsx — v2.6.0-preview by Roger (2025.10.19)
// ------------------------------------------------------------
// ✅ 增加「延伸探索」區（未來放置加值服務）
// ✅ 保留附註說明（AI 生成邏輯）
// ✅ 與 HBBK_2.6 架構一致
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
  const [symbol, setSymbol] = useState(null);
  const router = useRouter();

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
      } catch (err) {
        console.error("fetchCard error:", err);
        setStatus("❌ 系統錯誤，請重新感應生日卡 📱");
      }
    }
    fetchCard();
  }, []);

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

  const isBasic = !card.gender || !card.birth_time;

  const renderAISummary = (text) => {
    if (!text) return null;
    const cleanText = text
      .replace(/^#+\s*/gm, "")
      .replace(/\r/g, "")
      .trim();

    const sections = cleanText
      .split(/\n\s*\n/)
      .filter(Boolean)
      .map((part, i) => {
        const [title, ...body] = part.split(/[:：]/);
        return (
          <div key={i} style={{ marginBottom: "1rem", lineHeight: 1.7 }}>
            <h4
              style={{
                color: "#222",
                fontWeight: "700",
                marginBottom: "0.3rem",
                letterSpacing: "0.5px",
              }}
            >
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
            <strong> 生肖、星座、紫微命盤、血型與出生時間 </strong>
            等多重人格向度，透過 OpenAI 模型進行語意推演，呈現屬於你的獨特洞察。
          </p>

          {/* 💠 延伸探索（未來加值服務） */}
          <div
            style={{
              marginTop: "1.2rem",
              paddingTop: "0.8rem",
              borderTop: "1px dashed #ccc",
            }}
          >
            <h4 style={{ color: "#333", fontWeight: "700", marginBottom: "0.4rem" }}>
              🌠 延伸探索
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginTop: "0.8rem",
              }}
            >
              <button
                className={styles.exploreButton}
                onClick={() => router.push(`/service/fortune?uid=${card.uid}`)}
              >
                🔮 紫微流年解析 <span>（每次5點，專屬報告）</span>
              </button>

              <button
                className={styles.exploreButton}
                onClick={() => router.push(`/service/lifepath?uid=${card.uid}`)}
              >
                🧭 生命靈數分析 <span>（每次2點，短文顯示）</span>
              </button>

              <button
                className={styles.exploreButton}
                onClick={() => router.push(`/service/mbti?uid=${card.uid}`)}
              >
                🧠 MBTI 性格測驗 <span>（每次5點，問卷/專屬報告）</span>
              </button>
            </div>
          </div>
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

      {/* 💎 點數資訊 */}
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