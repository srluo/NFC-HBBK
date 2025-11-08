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
  // Token 驗證與 Session 儲存 (10 分鐘 TTL)
  // ------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    const cached = sessionStorage.getItem("book_token");
    const exp = Number(sessionStorage.getItem("book_token_exp") || 0);

    if (!t && (!cached || Date.now() > exp)) {
      sessionStorage.removeItem("book_token");
      sessionStorage.removeItem("book_token_exp");
      sessionStorage.removeItem("book_card_cache");
      setStatus("❌ Token 已過期，請重新感應生日卡 📱");
      return;
    }

    const tokenToUse = t || cached;
    try {
      const decoded = atob(tokenToUse);
      const parts = decoded.split(":");
      const expFromToken = parts.length >= 5 ? Number(parts[4]) : Date.now() + 600000;

      if (Date.now() > expFromToken) {
        sessionStorage.removeItem("book_token");
        sessionStorage.removeItem("book_token_exp");
        sessionStorage.removeItem("book_card_cache");
        setStatus("⚠️ Token 已逾時，請重新感應生日卡 📱");
        return;
      }

      sessionStorage.setItem("book_token", tokenToUse);
      sessionStorage.setItem("book_token_exp", expFromToken.toString());
      setToken(tokenToUse);
    } catch {
      sessionStorage.removeItem("book_token");
      sessionStorage.removeItem("book_token_exp");
      setStatus("❌ Token 無效，請重新感應生日卡");
    }
  }, []);

  // ------------------------------------------------------------
  // 讀卡資料
  // ------------------------------------------------------------
  useEffect(() => {
    if (!token) return;
    async function fetchCard() {
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
          if (parsed.pins?.enabled) setPinStage("verify");
          else setPinStage("unlocked");
        } else setStatus(`❌ ${data.error || "讀取失敗"}`);
      } catch {
        setStatus("❌ 系統錯誤");
      }
    }
    fetchCard();
  }, [token]);

  // ------------------------------------------------------------
  // 自動上鎖：閒置 5 分鐘（僅在 PIN 啟用時）
  // ------------------------------------------------------------
  useEffect(() => {
    let timer;
    if (pinStage === "unlocked") {
      timer = setTimeout(() => {
        if (card?.pins?.enabled) setPinStage("verify");
      }, 5 * 60 * 1000);
    }
    return () => clearTimeout(timer);
  }, [pinStage, card]);

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
      } catch {
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
      } catch {}
    }
    fetchDaily();
  }, [card, subStatus]);

  // ------------------------------------------------------------
  // PIN 設定與驗證
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
  // 畫面狀態
  // ------------------------------------------------------------
  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") {
    return (
      <div className={styles.container}>
        <div className={styles.cardHeader}>
          <h3>📡 {status}</h3>
          <button
            className={styles.expandBtn}
            onClick={() => (window.location.href = "https://nfc-hbbk.vercel.app/")}
          >
            🔄 重新感應生日卡
          </button>
        </div>
      </div>
    );
  }

  // 🔒 PIN 階段
  if (["verify", "set", "modify"].includes(pinStage)) {
    return (
      <div className={styles.container}>
        <div className={styles.menuBox}>
          <h3>🔐 {pinStage === "set" ? "設定 PIN 碼" : pinStage === "modify" ? "修改 PIN 碼" : "輸入 PIN 碼"}</h3>
          {pinStage === "modify" ? (
            <>
              <input type="password" placeholder="原 PIN" inputMode="numeric" maxLength="6"
                value={pinInput} onChange={(e) => setPinInput(e.target.value)} className={styles.pinInput} />
              <input type="password" placeholder="新 PIN" inputMode="numeric" maxLength="6"
                value={pinNew} onChange={(e) => setPinNew(e.target.value)} className={styles.pinInput} />
              <button className={styles.expandBtn} onClick={handleChangePin}>更新</button>
            </>
          ) : (
            <>
              <input type="password" inputMode="numeric" maxLength="6"
                value={pinInput} onChange={(e) => setPinInput(e.target.value)} className={styles.pinInput} />
              <button className={styles.expandBtn}
                onClick={pinStage === "set" ? handleSetPin : handleVerifyPin}>
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
          <img src={`/icons/constellation/${constellationMap[card.constellation] || "default"}.png`}
            alt={card.constellation} className={styles.icon} />
          <img src={`/icons/zodiac/${zodiacMap[card.zodiac] || "default"}.png`}
            alt={card.zodiac} className={styles.icon} />
        </div>
        <h2>{card.user_name || "未命名"}</h2>
        <p>{card.birthday}</p>
        <button className={styles.expandBtn} onClick={() => router.push(`/book/first?token=${token}`)}>
          {isBasic ? "📖 展開基本生日書" : "📖 展開完整生日書"}
        </button>
      </div>

      {/* 🌞 開通每日行動建議 */}
      {subStatus === "not_subscribed" && (
        <section className={styles.walletBox}>
          <h3>🌞 開通每日行動建議</h3>
          <p>每日早晨自動生成你的專屬行動建議，需扣除 <strong>5 點</strong>（有效期一年）。</p>
          <button
            className={styles.expandBtn}
            style={{ background: "#009688", marginTop: "0.6rem" }}
            onClick={async () => {
              if (Number(card.points) < 5) {
                alert("⚠️ 點數不足，請先補點後再開通每日行動建議");
                return;
              }
              if (!confirm("確定要開通每日行動建議？（將扣除 5 點）")) return;
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
                  alert(`✅ 已成功開通每日行動建議，有效至 ${data.active_until}`);
                  setSubStatus("ok");
                } else alert(`⚠️ ${data.message || "開通失敗"}`);
              } catch {
                alert("⚠️ 系統錯誤，請稍後再試");
              }
            }}
          >
            ☀️ 立即開通每日建議
          </button>
        </section>
      )}

      {/* ☀️ 今日行動建議 */}
      {subStatus === "ok" && daily && (
        <section className={styles.walletBox}>
          <center><h3>☀️ 今日行動建議</h3></center>
          <p>{daily.suggestion}</p>
        </section>
      )}

      {/* 點數 */}
      <div className={styles.menuBox}>
        <p>目前點數：<strong>{card.points}</strong></p>
      </div>

      {/* PIN 區塊 */}
      {!card.pins || card.pins.enabled === false ? (
        <section className={styles.menuBox}>
          <h3>🔐 生日書安全設定</h3>
          <p>您尚未啟用 PIN 上鎖。</p>
          <button className={styles.expandBtn} style={{ background: "#b46c2a" }}
            onClick={() => { setPinMsg(""); setPinInput(""); setPinStage("set"); }}>
            設定 PIN 上鎖
          </button>
        </section>
      ) : (
        <section className={styles.menuBox}>
          <h3>🔒 PIN 鎖已啟用</h3>
          <button className={styles.expandBtn}
            onClick={() => { setPinStage("modify"); setPinMsg(""); setPinInput(""); setPinNew(""); }}>
            修改 PIN
          </button>
          &nbsp;&nbsp;
          <button className={styles.expandBtn} style={{ background: "#8b0000" }} onClick={handleDisablePin}>
            解除 PIN 鎖
          </button>
        </section>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <button className={`${styles.footerBtn} ${styles.buyBtn}`} onClick={() => window.open("/intro", "_blank")}>
          🎁 購買生日卡
        </button>
        <button className={`${styles.footerBtn} ${styles.siteBtn}`} onClick={() => window.open("https://www.nfctogo.com", "_blank")}>
          🌐 前往 NFCTOGO 官網
        </button>
        <p className={styles.copy}>©2025 NFC靈動生日書 · Powered by NFCTOGO</p>
      </footer>
    </div>
  );
}
