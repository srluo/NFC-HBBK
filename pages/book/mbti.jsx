// /pages/book/mbti.jsx — v1.1 (加入首次/重新測驗扣點邏輯，完整保留 UI)

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./book.module.css";

export default function MBTIPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [card, setCard] = useState(null);
  const [status, setStatus] = useState("loading");

  // 手動填入 popup
  const [showEdit, setShowEdit] = useState(false);
  const [inputType, setInputType] = useState("");

  // ------------------------------------
  // 使用重試抓卡
  // ------------------------------------
  async function fetchCardWithRetry(token, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();
        if (res.ok && !data.error) return data.card;
      } catch {}
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error("getCard 重試失敗");
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || sessionStorage.getItem("book_token");

    if (!t) {
      setStatus("❌ 缺少 token，請重新感應生日卡 📱");
      return;
    }

    setToken(t);
    sessionStorage.setItem("book_token", t);

    (async () => {
      try {
        const cardData = await fetchCardWithRetry(t, 3);
        setCard(cardData);
        setStatus("ok");
      } catch {
        setStatus("⚠️ 系統忙碌中，請稍後再試");
      }
    })();
  }, []);

  if (status !== "ok") return <p className={styles.loading}>{status}</p>;

  const mbti = card.mbti_profile;

  // ------------------------------------------------------------
  // 加入扣點邏輯（唯一新增）
  // ------------------------------------------------------------
  async function handleStartTest(mode) {
    const cost = mode === "redo" ? 3 : 5;
    const apiMode = mode === "redo" ? "mbti_redo" : "mbti_new";

    if (card.points < cost) {
      alert(`點數不足（需 ${cost} 點），請先加值`);
      return;
    }

    // 扣點
    const res = await fetch(`/api/points-deduct?uid=${card.uid}&mode=${apiMode}`);
    const json = await res.json();

    if (!res.ok || json.error) {
      alert(`點數不足（需 ${cost} 點），請先加值`);
      return;
    }

    // 扣點成功 → 進入測驗
    router.push(`/book/MBTI24?uid=${card.uid}&mode=${mode}&token=${token}`);
  }

  // ------------------------------------------------------------
  // 生成 MBTI 顯示 UI
  // ------------------------------------------------------------
  const renderMBTIBlock = () => {
    if (!mbti) {
      return (
        <div className={styles.toolBox}>
          <h3>🧠 MBTI 人格特質</h3>
          <p>尚未設定 MBTI 類型，請選擇以下方式。</p>

          {/* 手動設定 2 點 */}
          <button
            className={styles.exploreButton}
            disabled={card.points < 2}
            style={{
              opacity: card.points < 2 ? 0.5 : 1,
              cursor: card.points < 2 ? "not-allowed" : "pointer",
            }}
            onClick={() => {
              if (card.points < 2) {
                alert("點數不足（需 2 點），請加值後使用。");
                return;
              }
              setShowEdit(true);
            }}
          >
            ✏️ 手動填入（2 點）
          </button>

          {/* 自動測驗 5 點（新版扣點流程） */}
          <button
            className={styles.exploreButton}
            disabled={card.points < 5}
            style={{
              opacity: card.points < 5 ? 0.5 : 1,
              cursor: card.points < 5 ? "not-allowed" : "pointer",
              marginTop: "0.6rem",
            }}
            onClick={() => handleStartTest("new")}
          >
            🧠 進行 MBTI 測驗（5 點）
          </button>

          {card.points < 5 && (
            <p style={{ color: "#d00", fontSize: "0.85rem", marginTop: "0.2rem" }}>
              點數不足（需 5 點），請加值後使用。
            </p>
          )}
        </div>
      );
    }

    // ----------------------
    // 已有 MBTI 的顯示頁
    // ----------------------
    return (
      <div className={styles.section}>
        <h3>🧠 MBTI 人格特質</h3>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <img
            src={`/img/MBTI/${mbti.icon}`}
            alt={mbti.type}
            style={{
              width: 96,
              height: 144,
              objectFit: "cover",
              background: "#f8f8f8",
              flexShrink: 0,
            }}
          />
          <div>
            <p>
              類型：<strong>{mbti.type}</strong>（{mbti.summary}）
            </p>
            <p style={{ fontSize: "0.85rem", color: "#888" }}>
              上次測驗：{new Date(mbti.last_test_ts).toLocaleString("zh-TW")}
            </p>
          </div>
        </div>

        {/* 描述區 */}
        <div
          style={{
            background: "#fafafa",
            borderRadius: 12,
            padding: "1rem",
            border: "1px solid #eee",
            lineHeight: 1.6,
          }}
        >
          <p>
            <strong>特質描述：</strong>
            {mbti.overview}
          </p>
          <p style={{ marginTop: "0.8rem" }}>
            <strong>人際與團隊：</strong>
            {mbti.relationship}
          </p>
          <p style={{ marginTop: "0.8rem" }}>
            <strong>適合工作：</strong>
            {mbti.career}
          </p>
        </div>

        {/* 重新測驗 / 手動修改 */}
        <div className={styles.menuBox} style={{ marginTop: "1rem" }}>
          <button
            className={styles.expandButton}
            disabled={card.points < 3}
            style={{
              opacity: card.points < 3 ? 0.4 : 1,
              cursor: card.points < 3 ? "not-allowed" : "pointer",
              marginTop: "1rem",
              background: "#007bff",
              color: "white",
            }}
            onClick={() => handleStartTest("redo")}
          >
            🔁 重新測驗（3 點）
          </button>

          <button
            className={styles.expandButton}
            disabled={card.points < 2}
            style={{
              opacity: card.points < 2 ? 0.4 : 1,
              cursor: card.points < 2 ? "not-allowed" : "pointer",
              marginTop: "0.6rem",
              background: "#007bff",
              color: "white",
            }}
            onClick={() => {
              if (card.points < 2) {
                alert("點數不足（需 2 點）。");
                return;
              }
              setShowEdit(true);
            }}
          >
            ✏️ 修改類型（2 點）
          </button>

          {card.points < 2 && (
            <p style={{ color: "#d00", fontSize: "0.85rem", marginTop: "0.2rem" }}>
              點數不足（需 2 點以上），請加值後使用。
            </p>
          )}
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------
  // 手動輸入 MBTI 視窗（完全保留）
  // ------------------------------------------------------------
  const renderEditPopup = () => {
    if (!showEdit) return null;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: "white",
            padding: "1.5rem",
            width: "90%",
            maxWidth: 360,
            borderRadius: 12,
          }}
        >
          <h3>手動設定 MBTI 類型</h3>
          <input
            type="text"
            placeholder="如 INFP"
            value={inputType}
            maxLength={4}
            onChange={(e) => setInputType(e.target.value.toUpperCase())}
            style={{
              width: "100%",
              padding: "0.6rem",
              borderRadius: 8,
              border: "1px solid #ccc",
              marginTop: "1rem",
              textAlign: "center",
            }}
          />

          <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
            <button
              className={styles.exploreButton}
              onClick={async () => {
                const type = inputType.toUpperCase();
                if (!type.match(/^[EI][SN][TF][JP]$/)) {
                  alert("請輸入有效的 MBTI 類型（如 INFP）");
                  return;
                }

                try {
                  // 扣點（2 點）
                  await fetch(
                    `/api/points-deduct?uid=${card.uid}&mode=mbti_manual`
                  );

                  // 查表
                  const res = await fetch(`/api/mbti-profiles?type=${type}`);
                  const p = await res.json();
                  const profile = {
                    type,
                    summary: p.summary,
                    overview: p.overview,
                    relationship: p.relationship,
                    career: p.career,
                    icon: p.icon,
                    last_test_ts: new Date().toISOString(),
                  };

                  await fetch("/api/mbti-result", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      uid: card.uid,
                      mbti_profile: profile,
                    }),
                  });

                  setCard((prev) => ({ ...prev, mbti_profile: profile }));
                  setShowEdit(false);
                } catch {
                  alert("儲存失敗，請稍後再試");
                }
              }}
            >
              儲存
            </button>

            <button
              className={styles.exploreButton}
              onClick={() => setShowEdit(false)}
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ------------------------------------------------------------
  // 主畫面
  // ------------------------------------------------------------
  return (
    <div className={styles.container}>
      <div className={styles.cardHeader}>
        <h2>🧠 MBTI 人格設定中心</h2>
        <p>在此查看或設定您的 MBTI 資料</p>
      </div>

      {renderMBTIBlock()}
      {renderEditPopup()}

      <section className={styles.toolBox}>
        <button
          className={styles.expandBtn}
          style={{ background: "#ff9800", marginTop: "0.6rem" }}
          onClick={() => router.push(`/book/first?token=${token}`)}
        >
          🔙 返回生日書
        </button>
      </section>
    </div>
  );
}