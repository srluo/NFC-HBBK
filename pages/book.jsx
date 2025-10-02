"use client";
import { useEffect, useState } from "react";

export default function BookPage() {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFirstOpen, setIsFirstOpen] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
      setError("❌ 缺少 token，請重新感應卡片");
      setLoading(false);
      return;
    }

    async function fetchCard() {
      try {
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "讀取失敗");
        } else {
          setCard(data.card);
          setIsFirstOpen(data.is_first_open);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCard();
  }, []);

  if (loading) return <p>載入中...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!card) return <p>找不到生日書資料</p>;

  return (
    <div style={{ padding: "1.5rem", maxWidth: "600px", margin: "0 auto" }}>
      {isFirstOpen ? (
        // ✅ 首次開啟 → 完整生日書
        <>
          <h1 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
            🎂 我的生日書（首次開卡）
          </h1>

          <div className="info" style={{ marginBottom: "1.5rem" }}>
            <p>姓名：{card.user_name}</p>
            <p>西曆生日：{card.birthday}</p>
            <p>農曆生日：{card.lunar_birthday || "未計算"}</p>
            <p>生肖：{card.zodiac || "未計算"}</p>
            <p>星座：{card.constellation || "未計算"}</p>
            <p>血型：{card.blood_type}</p>
            <p>出生時辰：{card.birth_time || "未填寫"}</p>
            <p>興趣嗜好：{card.hobbies || "未填寫"}</p>
          </div>

          <div className="book">
            <h2>📖 今日象徵</h2>
            <p>
              生日花：雞菊（純真、希望）｜誕生石：鑽石（純淨、堅定）｜主宰行星：火星
            </p>

            <h2>✨ 性格氣質</h2>
            <p>
              這一天出生的你，帶著開創能量與行動力，直率坦白，常常願意成為第一個站出來的人。
            </p>

            <h2>🌟 今日行動</h2>
            <p>把腦中的想法做成 1 個可落地的下一步。</p>

            <h2>🎁 開卡禮</h2>
            <p>恭喜獲得 20 點探索點數！</p>
          </div>
        </>
      ) : (
        // ✅ 再次開啟 → 縮圖 + 點數 + 功能選單
        <>
          <h1 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
            🎂 我的生日書
          </h1>

          <div
            className="summary"
            style={{
              padding: "1rem",
              background: "#f9f9f9",
              borderRadius: "8px",
              marginBottom: "1rem",
            }}
          >
            <p>
              📖 {card.birthday.slice(4, 6)}/{card.birthday.slice(6, 8)}{" "}
              生日書（縮圖版）
            </p>
            <button
              style={{ marginTop: "0.5rem" }}
              onClick={() => alert("TODO: 展開完整內容")}
            >
              展開完整內容
            </button>
          </div>

          <div className="points" style={{ marginBottom: "1.5rem" }}>
            <p>💎 剩餘點數：{card.points || 0} 點</p>
          </div>

          <div
            className="services"
            style={{
              background: "#eef8ff",
              padding: "1rem",
              borderRadius: "8px",
            }}
          >
            <h3>可使用服務</h3>
            <ul style={{ textAlign: "left" }}>
              <li>🔮 紫微流年（-3 點）</li>
              <li>🃏 占卜一次（-1 點）</li>
              <li>🧩 MBTI 檢測（-5 點）</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
