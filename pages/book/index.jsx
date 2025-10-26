// /pages/book/index.jsx — v2.7.0-PIN-Final
// ✅ PIN 全流程（set / verify / modify / disable）
// ✅ 閒置 5 分鐘自動上鎖
// ✅ 手機端輸入框自適應（防爆版）
// ✅ 完整 footer 與行動建議保留
// ✅ 使用 styles.pinInput 樣式（含 RWD 修正）

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
  const [pinStage, setPinStage] = useState("checking"); // checking / set / verify / unlocked / modify / disable
  const [pinInput, setPinInput] = useState("");
  const [pinNew, setPinNew] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const router = useRouter();

  // ------------------------------------------------------------
  // 讀卡資料
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
          const parsed = { ...data.card };
          try {
            if (typeof parsed.four_pillars === "string")
              parsed.four_pillars = JSON.parse(parsed.four_pillars);
            if (typeof parsed.ziweis === "string")
              parsed.ziweis = JSON.parse(parsed.ziweis);
            if (typeof parsed.pins === "string")
              parsed.pins = JSON.parse(parsed.pins);
          } catch (err) {
            console.warn("⚠️ JSON 解析錯誤:", err);
          }

          setCard(parsed);
          setStatus("ok");
          if (parsed.pins && parsed.pins.enabled === true)
            setPinStage("verify");
          else setPinStage("unlocked");
        } else {
          setStatus(`❌ ${data.error || "讀取失敗"}`);
        }
      } catch (err) {
        console.error(err);
        setStatus("❌ 系統錯誤");
      }
    }
    fetchCard();
  }, [router]);

  // ------------------------------------------------------------
  // 自動上鎖機制：閒置 5 分鐘進入 verify
  // ------------------------------------------------------------
  useEffect(() => {
    let timer;
    if (pinStage === "unlocked") {
      timer = setTimeout(() => {
        console.log("⏳ 自動上鎖");
        setPinStage("verify");
        setPinInput("");
      }, 5 * 60 * 1000);
    }
    return () => clearTimeout(timer);
  }, [pinStage]);

  // ------------------------------------------------------------
  // 訂閱檢查
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
        if (data.ok && data.subscribed) setSubStatus("ok");
        else setSubStatus("not_subscribed");
      } catch (err) {
        console.error("訂閱檢查錯誤:", err);
        setSubStatus("error");
      }
    }
    checkSubscription();
  }, [card]);

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
      } catch (err) {
        console.error("AI 行動建議錯誤:", err);
      }
    }
    fetchDaily();
  }, [card, subStatus]);

  // ------------------------------------------------------------
  // PIN 操作
  // ------------------------------------------------------------
  const handleSetPin = async () => {
    if (pinInput.length < 4) return setPinMsg("請輸入至少 4 位數 PIN");
    try {
      const res = await fetch("/api/pin/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: card.uid, pin: pinInput }),
      });
      const data = await res.json();
      if (data.ok) {
        setPinMsg("✅ 已設定 PIN 鎖！");
        setPinStage("unlocked");
        card.pins = { ...card.pins, enabled: true };
      } else setPinMsg(`⚠️ ${data.error}`);
    } catch {
      setPinMsg("❌ 系統錯誤");
    }
  };

  const handleVerifyPin = async () => {
    if (pinInput.length < 4) return setPinMsg("請輸入 PIN 碼");
    try {
      const res = await fetch("/api/pin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: card.uid, pin: pinInput }),
      });
      const data = await res.json();
      if (data.ok) setPinStage("unlocked");
      else setPinMsg(data.error || "PIN 錯誤");
    } catch {
      setPinMsg("❌ 系統錯誤");
    }
  };

  const handleChangePin = async () => {
    if (pinInput.length < 4 || pinNew.length < 4)
      return setPinMsg("請輸入舊 PIN 與新 PIN");
    try {
      const res = await fetch("/api/pin/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: card.uid, oldPin: pinInput, newPin: pinNew }),
      });
      const data = await res.json();
      if (data.ok) {
        setPinMsg("✅ PIN 已更新！");
        setPinStage("unlocked");
      } else setPinMsg(`⚠️ ${data.error}`);
    } catch {
      setPinMsg("❌ 系統錯誤");
    }
  };

  const handleDisablePin = async () => {
    if (!confirm("確定要解除 PIN 鎖？")) return;
    try {
      const res = await fetch("/api/pin/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: card.uid }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("🔓 PIN 鎖已解除");
        setPinStage("unlocked");
        setCard({ ...card, pins: { enabled: false } });
      } else alert(`⚠️ ${data.error}`);
    } catch {
      alert("❌ 系統錯誤");
    }
  };

  // ------------------------------------------------------------
  // 狀態控制：PIN 畫面
  // ------------------------------------------------------------
  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  if (["verify", "set", "modify"].includes(pinStage)) {
    return (
      <div className={styles.container}>
        <div className={styles.walletBox}>
          <h3>
            🔐 {pinStage === "set"
              ? "設定 PIN 碼"
              : pinStage === "modify"
              ? "修改 PIN 碼"
              : "輸入 PIN 碼"}
          </h3>

          {pinStage === "modify" ? (
            <>
              <p>請輸入原 PIN 與新 PIN 碼：</p>
              <input
                type="password"
                placeholder="原 PIN"
                inputMode="numeric"
                maxLength="6"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className={styles.pinInput}
              />
              <input
                type="password"
                placeholder="新 PIN"
                inputMode="numeric"
                maxLength="6"
                value={pinNew}
                onChange={(e) => setPinNew(e.target.value)}
                className={styles.pinInput}
                style={{ marginTop: "0.5rem" }}
              />
              <button className={styles.expandBtn} onClick={handleChangePin}>
                更新
              </button>
            </>
          ) : (
            <>
              <p>請輸入 4-6 位數 PIN 碼。</p>
              <input
                type="password"
                inputMode="numeric"
                maxLength="6"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className={styles.pinInput}
              />
              <button
                className={styles.expandBtn}
                onClick={pinStage === "set" ? handleSetPin : handleVerifyPin}
              >
                {pinStage === "set" ? "設定" : "確認"}
              </button>
            </>
          )}
          {pinMsg && <p style={{ color: "#c00" }}>{pinMsg}</p>}
        </div>
      </div>
    );
  }

  // ✅ 已解鎖畫面
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
        <button
          className={styles.expandBtn}
          onClick={() => router.push(`/book/first?token=${token}`)}
        >
          {isBasic ? "📖 展開基本生日書" : "📖 展開完整生日書"}
        </button>
      </div>

      {/* 行動建議 */}
      {subStatus === "ok" && daily && (
        <section className={styles.walletBox}>
          <h3>☀️ 今日行動建議</h3>
          <p>{daily.suggestion}</p>
        </section>
      )}

      {/* 點數區塊 */}
      <div className={styles.walletBox}>
        <p>目前點數：<strong>{card.points}</strong></p>
      </div>

      {/* 🔐 PIN 區 */}
      {!card.pins || card.pins.enabled === false ? (
        <section className={styles.walletBox} style={{ marginTop: "1rem" }}>
          <h3>🔐 生日書安全設定</h3>
          <p>您尚未啟用 PIN 上鎖，來保護個人資料。</p>
          <button
            className={styles.expandBtn}
            style={{ background: "#b46c2a" }}
            onClick={() => {
              setPinMsg("");
              setPinInput("");
              setPinStage("set");
            }}
          >
            設定 PIN 上鎖
          </button>
        </section>
      ) : (
        <section className={styles.walletBox} style={{ marginTop: "1rem" }}>
          <h3>🔒 PIN 鎖已啟用</h3>
          <button
            className={styles.expandBtn}
            onClick={() => {
              setPinStage("modify");
              setPinMsg("");
              setPinInput("");
              setPinNew("");
            }}
          >
            修改 PIN
          </button>
          &nbsp;&nbsp;
          <button
            className={styles.expandBtn}
            style={{ background: "#8b0000" }}
            onClick={handleDisablePin}
          >
            解除 PIN 鎖
          </button>
        </section>
      )}

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
