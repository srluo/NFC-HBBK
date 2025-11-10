// /book/yign.jsx v3.4

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./book.module.css";

export default function YiGN() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [finished, setFinished] = useState(false); // ✅ 新增狀態

  // ------------------------------------------------------------
  // 開始占卜
  // ------------------------------------------------------------
  async function startDivination() {
    if (!question) return setMsg("⚠️ 請先輸入問題！");
    setMsg(""); setLoading(true); setResult(null);

    const token = sessionStorage.getItem("book_token");
    if (!token) {
      setMsg("❌ 無效的 Token，請重新感應卡片。");
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ token, question });
      const res = await fetch(`/api/yign-draw?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setMsg(data.error || "⚠️ 伺服器錯誤，請稍後再試。");
      } else {
        setResult(data);
        sessionStorage.setItem("lastYign", JSON.stringify(data));
        setFinished(true); // ✅ 鎖定按鈕
      }
    } catch {
      setMsg("⚠️ 無法連線至占卜服務。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.drawCard}>
        <h2>🔮 易光年・易經占卜</h2>

        <p className={styles.subtitle}>
          <b>請輸入你此刻想詢問的問題：</b>
          <br /><br />
        <input
            type="text"
            placeholder="例如：我該如何面對目前的挑戰？"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className={styles.input}
            disabled={finished} // ✅ 鎖定輸入
        />
        </p>

        <p>
          <button onClick={() => setShowGuide(true)} className={styles.linkBtn}>
            📖 占卜提問指南
          </button>
        </p>

        <button
          onClick={startDivination}
          disabled={loading || finished}
          className={styles.expandBtn}
        >
          {loading ? "⏳ 解卦中..." : finished ? "✅ 解卦完成" : "開始占卜"}
        </button>
      </div>

      {msg && <p className={styles.error}>{msg}</p>}

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>AI 正在解卦中...</p>
        </div>
      )}

      {result && (
        <div className={styles.walletBox}>
          <h3>🪶 {result.gua ? `第${result.gua.g}卦 ${result.gua.name}` : "未知卦象"}</h3>
          <p><b>卦辭：</b>{result.gua.guaci || "卦辭內容略。"}</p>
          <p><b>動爻：</b>{result.gua.yao || "爻不詳。"}</p>
          <p><b>爻辭：</b>{result.gua.yaoci || "爻辭內容略。"}</p>

          <hr />

          <h3>🔮 AI 解卦結果</h3>
          <div className={styles.typing}>
            {result.result
              .replace(/\\n\\n/g, "\n\n") // ✅ 將文字 "\n\n" 換成真正換行
              .split("\n\n")
              .map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
          </div>

          <hr />
          <p className={styles.subtitle}>人格參考：{result.profile}</p>
        </div>
      )}

      {/* 占卜提問指南 Modal */}
      {showGuide && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalDark}>
            <h2>📖 占卜提問指南</h2>

            <p><b>三要：</b> 明確、具體、當下。</p>
            <ul>
              <li>👉 問題要清楚簡單，避免含糊。</li>
              <li>👉 聚焦一件事，避免一次問多件事。</li>
              <li>👉 問與自己切身相關的事，而非替他人代問。</li>
            </ul>

            <p><b>三不要：</b> 不誠、不義、不疑。</p>
            <ul>
              <li>👉 心不誠，不要占。</li>
              <li>👉 涉及不義之事，不要占。</li>
              <li>👉 問題若充滿懷疑與挑釁，也不要占。</li>
            </ul>

            <hr />

            <p className={styles.good}><b>✅ 好的提問範例：</b></p>
            <ul>
              <li>我該如何規劃接下來三個月的事業發展？</li>
              <li>這份合作對我的長遠影響是什麼？</li>
              <li>我在感情中目前的處境代表什麼意義？</li>
              <li>如何面對最近遇到的財務壓力？</li>
              <li>如果選擇換工作，未來走向會如何？</li>
              <li>要不要繼續經營這段友誼，會帶來什麼結果？</li>
              <li>在創業過程中，我該注意哪些隱藏的挑戰？</li>
            </ul>

            <p className={styles.bad}><b>❌ 不建議的提問：</b></p>
            <ul>
              <li>對錯式：「這樣做對不對？」</li>
              <li>絕對式：「我會不會成功？」</li>
              <li>時間式：「我什麼時候會發財？」</li>
              <li>幫他人決定：「他是不是喜歡我？」</li>
            </ul>

            <hr />
            <p style={{ color: "#ccc" }}>
              <b>傅佩榮提醒：</b> 占卜結果不是命定，而是一段「運」的啟示；
              提問者應帶著誠意與敬意，把卦象當作反思與行動的參考。
            </p>

            <button onClick={() => setShowGuide(false)} className={styles.closeBtn}>
              關閉
            </button>
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <button
          onClick={() => {
            setFinished(false); // ✅ 回到生日書時重置狀態
            router.push("/book");
          }}
          className={styles.backBtn}
        >
          ← 返回生日書
        </button>
      </div>
    </div>
  );
}