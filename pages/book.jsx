"use client";
import { useEffect, useState } from "react";

export default function BookPage() {
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      <h1 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>🎂 我的生日書</h1>

      <div className="info" style={{ marginBottom: "1.5rem" }}>
        <p>姓名：{card.user_name}</p>
        <p>生日：{card.birthday}</p>
        <p>血型：{card.blood_type}</p>
        <p>出生時辰：{card.birth_time || "未填寫"}</p>
        <p>興趣嗜好：{card.hobbies || "未填寫"}</p>
      </div>

      <div className="points" style={{ marginBottom: "1.5rem" }}>
        <p>💎 剩餘點數：{card.points || 0} 點</p>
      </div>

      <div className="book">
        <h2>📖 今日象徵</h2>
        <p>生日花：雞菊（純真、希望） | 誕生石：鑽石（純淨、堅定）</p>

        <h2>✨ 性格氣質</h2>
        <p>
          這一天出生的你，帶著開創能量與行動力，直率坦白，常常願意成為第一個站出來的人。
        </p>

        <h2>🌟 今日行動</h2>
        <p>把腦中的想法做成 1 個可落地的下一步。</p>
      </div>
    </div>
  );
}
