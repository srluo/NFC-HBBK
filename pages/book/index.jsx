// /pages/book/index.jsx — v3.9.13 (TXLOG Display Friendly Edition)
// Author: Roger Luo｜NFCTOGO
// Date: 2025.11.10

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
  const [subStatus, setSubStatus] = useState("checking");
  const [pinStage, setPinStage] = useState("checking");
  const [pinInput, setPinInput] = useState("");
  const [pinNew, setPinNew] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const router = useRouter();

  // ------------------------------------------------------------
  // Token 驗證與 Session 儲存 (20 分鐘 TTL)
  // ------------------------------------------------------------
  useEffect(() => {
    console.log("[Book] Token check start");
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    const cached = sessionStorage.getItem("book_token");
    const exp = Number(sessionStorage.getItem("book_token_exp") || 0);

    if (!t && (!cached || Date.now() > exp)) {
      sessionStorage.clear();
      setStatus("❌ Token 已過期，請重新感應生日卡 📱");
      return;
    }

    const tokenToUse = t || cached;
    try {
      const decoded = atob(tokenToUse);
      const parts = decoded.split(":");
      const expFromToken = parts.length >= 5 ? Number(parts[4]) : Date.now() + 1200000;
      if (Date.now() > expFromToken) {
        sessionStorage.clear();
        setStatus("⚠️ Token 已逾時，請重新感應生日卡 📱");
        return;
      }
      sessionStorage.setItem("book_token", tokenToUse);
      sessionStorage.setItem("book_token_exp", expFromToken.toString());
      setToken(tokenToUse);
      console.log("[Book] Token validated");
    } catch {
      sessionStorage.clear();
      setStatus("❌ Token 無效，請重新感應生日卡");
    }
  }, []);

  // ------------------------------------------------------------
  // 讀卡資料
  // ------------------------------------------------------------
  async function fetchCard(force = false) {
    const cache = sessionStorage.getItem("book_card_cache");
    if (!token) return;
    if (!force && cache) {
      setCard(JSON.parse(cache));
      setStatus("ok");
      return;
    }
    try {
      const res = await fetch(`/api/getCard?token=${token}`);
      const data = await res.json();
      if (res.ok && !data.error) {
        const parsed = { ...data.card };
        try {
          if (typeof parsed.four_pillars === "string") parsed.four_pillars = JSON.parse(parsed.four_pillars);
          if (typeof parsed.ziweis === "string") parsed.ziweis = JSON.parse(parsed.ziweis);
          if (typeof parsed.pins === "string") parsed.pins = JSON.parse(parsed.pins);
        } catch {}
        setCard(parsed);
        sessionStorage.setItem("book_card_cache", JSON.stringify(parsed));
        setStatus("ok");
        setPinStage(parsed.pins?.enabled ? "verify" : "unlocked");
      } else setStatus(`❌ ${data.error || "讀取失敗"}`);
    } catch {
      setStatus("❌ 系統錯誤");
    }
  }

  useEffect(() => { if (token) fetchCard(true); }, [token]);

  // ------------------------------------------------------------
  // 回焦重新載入（確保點數最新）
  // ------------------------------------------------------------
  useEffect(() => {
    const onFocus = () => fetchCard(true);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onFocus();
    });
    return () => document.removeEventListener("visibilitychange", onFocus);
  }, [token]);

  // ------------------------------------------------------------
  // 每日行動建議
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
            blood_type: card.blood_type,
            constellation: card.constellation,
            ziweis: card.ziweis || {},
          }),
        });
        const data = await res.json();
        if (data.ok && data.suggestion) {
          setDaily(data);
          localStorage.setItem(todayKey, JSON.stringify(data));
        }
      } catch {}
    }
    fetchDaily();
  }, [card, subStatus]);

  // ------------------------------------------------------------
  // 💎 加值服務扣點（含 localStorage 檢查）
  // ------------------------------------------------------------
  async function handleService(type, card) {
    const t = sessionStorage.getItem("book_token");
    if (!t) { alert("⚠️ Session 過期，請重新感應卡片"); return; }

    if (type === "fortune") {
      const todayKey = `fortune-result-${card.uid}-${new Date().toISOString().slice(0, 10)}`;
      const cached = localStorage.getItem(todayKey);
      if (cached) {
        const data = JSON.parse(cached);
        sessionStorage.setItem("lastFortune", JSON.stringify(data));
        alert("☀️ 今日運勢已完成，顯示今日結果。");
        window.location.href = "/book/fortune";
        return;
      }
    }

    try {
      const res = await fetch(`/api/points-deduct?token=${t}&service=${type}`);
      const data = await res.json();
      if (!res.ok || data.error) { alert(data.error || "扣點失敗"); return; }
      if (data.message) alert(data.message);
      sessionStorage.setItem("book_token", data.serviceToken);
      sessionStorage.setItem("book_token_exp", (Date.now() + 10 * 60 * 1000).toString());
      if (type === "yign") window.location.href = "/book/yign";
      else if (type === "fortune") window.location.href = "/book/fortune";
    } catch (err) {
      console.error("扣點 API 錯誤:", err);
      alert("⚠️ 無法連線至伺服器");
    }
  }

  // ------------------------------------------------------------
  // 畫面狀態
  // ------------------------------------------------------------
  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") {
    return (
      <div className={styles.container}>
        <div className={styles.cardHeader}>
          <h3>📡 {status}</h3>
          <button className={styles.expandBtn} onClick={() => (window.location.href = "https://nfc-hbbk.vercel.app/")}>
            🔄 重新感應生日卡
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // 🧾 我的紀錄 — TXLOG Display Friendly
  // ------------------------------------------------------------
  const serviceNameMap = {
    yign: "易光年占卜（扣點）",
    fortune: "西洋占星・今日運勢（扣點）",
    daily: "每日行動建議（扣點）",
  };

  const isBasic = !card.gender || !card.birth_time;

  return (
    <div className={styles.container}>
      {/* Header */}
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
        <button className={styles.expandBtn} onClick={() => router.push(`/book/first?token=${token}`)}>
          {isBasic ? "📖 展開基本生日書" : "📖 展開完整生日書"}
        </button>
      </div>

      {/* 🧩 加值服務區塊 */}
      <section className={styles.menuBox}>
        <p>🪙 目前點數：<strong>{card.points ?? "—"}</strong></p>
        <hr />
        <h3>🧩 加值服務</h3>
        <p className={styles.sub}>每次占卜將扣 <b>1 點</b></p>
        <div className={styles.serviceRow}>
          <button disabled={!card.points || Number(card.points) <= 0} onClick={() => handleService("yign", card)}>
            易光年・易經占卜 🔮
          </button>
          <button disabled={!card.points || Number(card.points) <= 0} onClick={() => handleService("fortune", card)}>
            西洋占星・今日運勢 🌟
          </button>
        </div>
      </section>

      {/* 🧾 我的紀錄 */}
      {Array.isArray(card?.txlog) && card.txlog.length > 0 && (
        <section className={styles.walletBox}>
          <h3>🧾 我的紀錄</h3>
          <p className={styles.sub}>顯示最近 10 筆占卜、運勢或加值紀錄：</p>
          <div className={styles.txlogList}>
            {card.txlog.map((log, i) => (
              <div key={i} className={styles.txItem}>
                <p>
                  <b>{log.date}</b>｜
                  {log.service || serviceNameMap[log.type] || log.type}
                </p>
                {log.q && <p>🪶 {log.q}</p>}
                {log.gua && <p>卦象：{log.gua}（{log.yao}）</p>}
                <p>點數：{log.points_before ?? "—"} → {log.points_after ?? "—"}</p>
                <hr />
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <p className={styles.copy}>©2025 NFC靈動生日書 · Powered by NFCTOGO</p>
      </footer>
    </div>
  );
}