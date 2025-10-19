// /pages/book/index.jsx — v2.4.8-final
// ✅ 以 v2.4.7 為基礎，移除主題／語氣行
// ✅ 保持 v2.4.4 原配色與結構一致
// ------------------------------------------------------------

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./book.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";

export default function Book() {
  const [card, setCard] = useState(null);
  const [status, setStatus] = useState("loading");
  const [token, setToken] = useState(null);
  const [daily, setDaily] = useState(null);
  const [subStatus, setSubStatus] = useState("checking"); // ok | not_subscribed | error
  const router = useRouter();

  // ------------------------------------------------------------
  // 讀卡資料
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // 檢查每日行動建議訂閱狀態
  // ------------------------------------------------------------
  useEffect(() => {
    if (!card) return;
    async function checkSubscription() {
      try {
        const res = await fetch("/api/check-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: card.uid, service: "daily" }),
        });
        const data = await res.json();
        if (data.ok && data.subscribed) {
          setSubStatus("ok");
        } else {
          setSubStatus("not_subscribed");
        }
      } catch (err) {
        console.error("訂閱檢查錯誤:", err);
        setSubStatus("error");
      }
    }
    checkSubscription();
  }, [card]);

  // ------------------------------------------------------------
  // 取得每日行動建議（含快取）
  // ------------------------------------------------------------
  useEffect(() => {
    if (!card || subStatus !== "ok") return;

    const todayKey = `ai-daily-${card.uid}-${new Date().toISOString().slice(0, 10)}`;
    const cached = localStorage.getItem(todayKey);
    if (cached) {
      setDaily(JSON.parse(cached));
      return;
    }

    async function fetchDaily() {
      try {
        const res = await fetch("/api/ai-daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: card.uid,
            birthday: card.birthday,
            gender: card.gender,
            ming_lord: card.ming_lord,
            constellation: card.constellation,
            blood_type: card.blood_type,
          }),
        });
        const data = await res.json();
        if (data.ok && data.suggestion) {
          setDaily(data);
          localStorage.setItem(todayKey, JSON.stringify(data));
        }
      } catch (err) {
        console.error("AI 行動建議錯誤:", err);
      }
    }
    fetchDaily();
  }, [card, subStatus]);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  const isBasic = !card.gender || !card.birth_time;

  // ------------------------------------------------------------
  // 畫面區塊
  // ------------------------------------------------------------
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
          {isBasic ? "📖 展開基本生日書" : "📖 展開完整生日書"}
        </button>
      </div>

      {/* 補填提示（基本層級） */}
      {isBasic && (
        <section className={styles.walletBox}>
          <h3>🎁 填寫完整資訊可獲贈 <strong>20 點</strong>！</h3>
          <p style={{ marginTop: "0.3rem" }}>
            補填性別與出生時辰，開啟紫微命格分析 🔮
          </p>
          <button
            className={styles.expandBtn}
            style={{ marginTop: "0.6rem" }}
            onClick={() =>
              router.push(`/activate?token=${token}&mode=update&d=${card.birthday}`)
            }
          >
            ✏️ 立即補填
          </button>
        </section>
      )}

      {/* 💡 今日行動建議（保留 walletBox 樣式） */}
      {subStatus === "ok" && daily && (
        <section className={styles.walletBox}>
          <h3>☀️ 今日行動建議</h3>
          <p>{daily.suggestion}</p>
        </section>
      )}

      {subStatus === "not_subscribed" && (
        <section className={styles.walletBox}>
          <h3>🔓 尚未開通 AI 行動建議</h3>
          <button
            className={styles.expandBtn}
            onClick={async () => {
              try {
                const res = await fetch("/api/subscribe-service", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    uid: card.uid,
                    service: "daily",
                    days: 365,
                    cost: 5,
                  }),
                });
                const data = await res.json();
                if (data.ok) {
                  alert("✅ 已成功開通每日行動建議！");
                  window.location.reload();
                } else {
                  alert(`⚠️ ${data.message || "開通失敗"}`);
                }
              } catch (err) {
                alert("⚠️ 系統錯誤，請稍後再試");
              }
            }}
          >
            ✨ 開通每日行動建議
          </button>
        </section>
      )}

      {/* 點數資訊 */}
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
        <p className={styles.copy}>
          ©2025 NFC靈動生日書 · Powered by NFCTOGO
        </p>
      </footer>
    </div>
  );
}