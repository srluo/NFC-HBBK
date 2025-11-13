// /pages/book/MBTI24.jsx — v2.0 (Likert 5-scale, 不自動扣點版本)
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./book.module.css";

export default function MBTI24() {
  const router = useRouter();
  const [uid, setUid] = useState("");
  const [mode, setMode] = useState("new");
  const [token, setToken] = useState("");
  const [answers, setAnswers] = useState(Array(24).fill(null));
  const [status, setStatus] = useState("loading");
  const [cost, setCost] = useState(5);

  // -------------------------------
  // 初始化（本頁不扣點！扣點在入口頁進行）
  // -------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get("uid");
    const m = params.get("mode") || "new";
    const t = sessionStorage.getItem("book_token") || params.get("token") || "";

    if (!u) {
      setStatus("❌ 缺少 UID");
      return;
    }

    setUid(u);
    setMode(m);
    setToken(t);
    setCost(m === "redo" ? 3 : 5);

    // 不自動扣點，直接允許作答
    setStatus("ok");
  }, []);

  // -------------------------------
  // MBTI 24 題題庫（固定）
  // -------------------------------
  const questions = [
    { dim: "EI", text: "我在團體中通常是發言的人而非聽眾。" },
    { dim: "EI", text: "我喜歡熱鬧的聚會並從中獲得能量。" },
    { dim: "SN", text: "我傾向用事實與經驗來判斷世界。" },
    { dim: "SN", text: "我對抽象概念與可能性更有興趣。" },
    { dim: "TF", text: "做決定時我偏好依據邏輯與原則。" },
    { dim: "TF", text: "處理問題時我也重視別人的感受。" },
    { dim: "JP", text: "我喜歡按計畫進行，避免臨時變動。" },
    { dim: "JP", text: "我能靈活調整計畫以應對變化。" },

    { dim: "EI", text: "與人互動比獨處更能充電。" },
    { dim: "EI", text: "我偏好先行動再思考，而非反過來。" },
    { dim: "SN", text: "我注重細節，實際面多於想像面。" },
    { dim: "SN", text: "我習慣從大局看事情而非局部細節。" },
    { dim: "TF", text: "我在辯論中重視事實大於情緒。" },
    { dim: "TF", text: "當別人難過時，我會優先安撫與共感。" },
    { dim: "JP", text: "我傾向按時完成任務並喜歡列表。" },
    { dim: "JP", text: "我享受自發性與即興行動。" },

    { dim: "EI", text: "我較擅長口頭表達，勝過書面表達。" },
    { dim: "EI", text: "我常因社交活動感到疲憊。" },
    { dim: "SN", text: "我會依據過去經驗掌握事情的脈絡。" },
    { dim: "SN", text: "我喜歡跳脫框架，想像未來可能性。" },
    { dim: "TF", text: "我認為公平比照顧個人更重要。" },
    { dim: "TF", text: "我希望避免衝突與傷害他人。" },
    { dim: "JP", text: "我傾向遵守計畫、時間表與流程。" },
    { dim: "JP", text: "我常延後決定以保留更多可能性。" },
  ];

  // -------------------------------
  // 使用者作答
  // -------------------------------
  const handleAnswer = (i, val) => {
    const arr = [...answers];
    arr[i] = val;
    setAnswers(arr);
  };

  // -------------------------------
  // 計算 MBTI 類型（Likert 版）
  // -------------------------------
  const computeMBTI = () => {
    const dimScores = { EI: 0, SN: 0, TF: 0, JP: 0 };

    answers.forEach((v, i) => {
      const { dim } = questions[i];
      dimScores[dim] += v - 3; // 中立 3 → 0
    });

    const EI = dimScores.EI >= 0 ? "E" : "I";
    const SN = dimScores.SN >= 0 ? "S" : "N";
    const TF = dimScores.TF >= 0 ? "T" : "F";
    const JP = dimScores.JP >= 0 ? "J" : "P";

    return EI + SN + TF + JP;
  };

  // -------------------------------
  // 提交測驗
  // -------------------------------
  const handleSubmit = async () => {
    if (answers.includes(null)) {
      alert("請完成所有題目喔！");
      return;
    }

    const type = computeMBTI();

    try {
      // 查表 JSON
      const res = await fetch(`/api/mbti-profiles?type=${type}`);
      if (!res.ok) throw new Error("查表失敗");
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

      // 寫入 Redis
      await fetch("/api/mbti-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, mbti_profile: profile }),
      });

      alert(`測驗完成！您的 MBTI 是 ${type}`);
      router.push(`/book/first?token=${token}`);
    } catch (err) {
      console.error(err);
      alert("系統忙碌，請稍後再試。");
    }
  };

  if (status !== "ok") return <p className={styles.loading}>{status}</p>;

  return (
    <div className={styles.container}>
      <div className={styles.cardHeader}>
        <h2>🧠 MBTI 精簡測驗（24 題）</h2>
        <p>模式：{mode === "redo" ? "重新測驗" : "首次測驗"} ｜ 扣 {cost} 點</p>
      </div>

      <div className={styles.toolBox}>
        <p style={{ fontSize: "0.85rem", color: "#666" }}>
          1 = 強烈不同意，5 = 強烈同意
        </p>

        <ol style={{ lineHeight: 1.7 }}>
          {questions.map((q, i) => (
            <li key={i} style={{ marginBottom: "0.8rem" }}>
              {q.text}
              <div
                style={{
                  display: "flex",
                  gap: "0.3rem",
                  marginTop: "0.4rem",
                }}
              >
                {[1, 2, 3, 4, 5].map((v) => (
                  <label
                    key={v}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: "0.8rem",
                    }}
                  >
                    <input
                      type="radio"
                      name={`q${i}`}
                      value={v}
                      checked={answers[i] === v}
                      onChange={() => handleAnswer(i, v)}
                    />
                    <div style={{ marginTop: "0.2rem" }}>{v}</div>
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ol>

        <button
          className={styles.expandBtn}
          style={{ background: "#007bff", marginTop: "1rem" }}
          onClick={handleSubmit}
        >
          ✅ 提交測驗
        </button>

        <button
          className={styles.expandBtn}
          style={{ background: "#ff9800", marginTop: "0.5rem" }}
          onClick={() => router.push(`/book/mbti?uid=${uid}`)}
        >
          🔙 返回
        </button>
      </div>
    </div>
  );
}