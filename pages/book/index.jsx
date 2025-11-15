// /pages/book/index.jsx — v3.9.14-secure (PIN Secure Edition)
// Author: Roger Luo｜NFCTOGO
// Date: 2025.11.13

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

  // ✅ 每次進入不同 PIN 階段時，清空暫存 PIN（防瀏覽器自動填入殘留）
  useEffect(() => {
    setPinInput("");
    setPinNew("");
  }, [pinStage]);

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
  // 自動上鎖：閒置 10 分鐘（僅在 PIN 啟用時）
  // ------------------------------------------------------------
  useEffect(() => {
    let timer;
    if (pinStage === "unlocked") {
      timer = setTimeout(() => {
        if (card?.pins?.enabled) {
          console.log("[Book] Auto-lock triggered");
          setPinStage("verify");
        }
      }, 10 * 60 * 1000);
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
  // 設定 / 驗證 / 修改 / 關閉 PIN
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
      if (data.ok) {
        setPinStage("unlocked");
        setPinMsg("");
      } else setPinMsg(data.error || "PIN 錯誤");
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
          <button className={styles.expandBtn} onClick={() => (window.location.href = "https://nfc-hbbk.vercel.app/")}>
            🔄 重新感應生日卡
          </button>
        </div>
      </div>
    );
  }

  // 🔒 PIN 互動階段（設定 / 驗證 / 修改）
  if (["verify", "set", "modify"].includes(pinStage)) {
    return (
      <div className={styles.container}>
        <div className={styles.toolBox}>
          <h3>
            🔐{" "}
            {pinStage === "set"
              ? "設定 PIN 碼"
              : pinStage === "modify"
              ? "修改 PIN 碼"
              : "輸入 PIN 碼"}
          </h3>

          {pinStage === "modify" ? (
            <>
              <p>請輸入原 PIN 及新 PIN 碼：</p>
              <input
                type="tel"
                placeholder="原 PIN（4~6 位數字）"
                inputMode="numeric"
                pattern="[0-9]{4,6}"
                maxLength="6"
                autoComplete="off"
                name="pin-old"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                onFocus={(e) => {
                  setPinInput("");
                  e.target.value = "";
                }}
                className={styles.pinInput}
              />
              <input
                type="tel"
                placeholder="新 PIN（4~6 位數字）"
                inputMode="numeric"
                pattern="[0-9]{4,6}"
                maxLength="6"
                autoComplete="off"
                name="pin-new"
                value={pinNew}
                onChange={(e) => setPinNew(e.target.value.replace(/\D/g, ""))}
                onFocus={(e) => {
                  setPinNew("");
                  e.target.value = "";
                }}
                className={styles.pinInput}
                style={{ marginTop: "0.5rem" }}
              />
              <br />
              <button className={styles.expandBtn} onClick={handleChangePin}>
                更新
              </button>
            </>
          ) : (
            <>
              <p>請輸入 4~6 位數字 PIN 碼。</p>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{4,6}"
                maxLength="6"
                autoComplete="off"
                name="pin-verify"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                onFocus={(e) => {
                  setPinInput("");
                  e.target.value = "";
                }}
                className={styles.pinInput}
              />
              <br />
              <button
                className={styles.expandBtn}
                onClick={pinStage === "set" ? handleSetPin : handleVerifyPin}
              >
                {pinStage === "set" ? "設定" : "確認"}
              </button>
            </>
          )}
          {pinMsg && <p style={{ color: "#c00", marginTop: "0.6rem" }}>{pinMsg}</p>}
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

  // ------------------------------------------------------------
  // 主畫面：已解鎖狀態
  // ------------------------------------------------------------
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

      {/* 🌞 開通每日行動建議 */}
      {subStatus === "not_subscribed" && (
        <section className={styles.walletBox}>
          <center>
          <h3>🌞 開通每日行動建議</h3></center>
          <p>每日早晨自動生成你的專屬行動建議，需扣除 <strong>5 點</strong>（有效期一年）。</p>
          <center>
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
          </button></center>
        </section>
      )}

      {/* ☀️ 今日行動建議 */}
      {subStatus === "ok" && daily && (
        <section className={styles.walletBox}>
          <center><h3>☀️ 今日行動建議</h3></center>
          <p>{daily.suggestion}</p>
        </section>
      )}

      {/* 🧩 加值服務區塊 */}
      <section className={styles.menuBox}>
        <p>🪙 目前點數：<strong>{card.points ?? "—"}</strong></p>
        <hr />
        <h3>🧩 加值服務</h3>
        <p className={styles.sub}>每次占卜將扣 <b>1 點</b></p>
        <div className={styles.serviceRow}>
          <button
            disabled={!card.points || Number(card.points) <= 0}
            onClick={() => handleService("yign", card)}
          >
            易光年・易經占卜 🔮
          </button>
          <button
            disabled={!card.points || Number(card.points) <= 0}
            onClick={() => handleService("fortune", card)}
          >
            西洋占星・今日運勢 🌟
          </button>
        </div>
        {!card.points || Number(card.points) <= 0 ? (
          <p style={{ color: "#c00", marginTop: "6px" }}>⚠️ 點數不足，請先加值。</p>
        ) : null}
      </section>

      {/* PIN 區塊 */}
      {!card.pins || card.pins.enabled === false ? (
        <section className={styles.toolBox}>
          <h3>🔐 生日書安全設定</h3>
          <p>您尚未啟用 PIN 上鎖。</p>
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
        <section className={styles.toolBox}>
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
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <button
          className={`${styles.footerBtn} ${styles.buyBtn}`}
          onClick={() => window.open("/intro", "_blank")}
        >
          🎁 購買生日卡
        </button>
        <button
          className={`${styles.footerBtn} ${styles.siteBtn}`}
          onClick={() => window.open("https://www.nfctogo.com", "_blank")}
        >
          🌐 前往 NFCTOGO 官網
        </button>
        <p className={styles.copy}>©2025 NFC靈動生日書 · Powered by NFCTOGO</p>
        <button
          style={{ background: "#444", color: "#fff", marginTop: "10px" }}
          onClick={() => {
            const todayKey = `fortune-result-${card.uid}-${new Date().toISOString().slice(0, 10)}`;
            localStorage.removeItem(todayKey);
            alert("🧹 已清除今日運勢快取，下次將重新生成。");
          }}
        >
          🧹 清除今日運勢快取（測試用）
        </button>
      </footer>
    </div>
  );
}

// ------------------------------------------------------------
// 💎 加值服務扣點（含 localStorage 檢查與重顯）
// ------------------------------------------------------------
// 💎 扣點＋占卜流程控制
async function handleService(type, card) {
  const t = sessionStorage.getItem("book_token");
  if (!t) {
    alert("⚠️ Session 過期，請重新感應卡片");
    return;
  }

  // ✅ 若今日已有 localStorage 結果，直接展示，不再扣點
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

  // ✅ 首次占卜才扣點
  try {
    const res = await fetch(`/api/points-deduct?token=${t}&service=${type}`);
    const data = await res.json();
    if (!res.ok || data.error) {
      alert(data.error || "扣點失敗");
      return;
    }
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