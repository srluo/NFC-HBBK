"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function BookPage() {
  const router = useRouter();
  const { uid, token } = router.query;
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }

    async function fetchCard() {
      try {
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();
        if (data.error) {
          alert("讀取卡片資料失敗：" + data.error);
          return;
        }
        setCard(data.card);
      } catch (err) {
        console.error("讀取失敗:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCard();
  }, [token, router]);

  if (loading) return <p>讀取中...</p>;
  if (!card) return <p>找不到卡片資料</p>;

  return (
    <div style={{ padding: "1.5rem", fontFamily: "Microsoft JhengHei, sans-serif" }}>
      <h2>🎂 {card.user_name} 的生日書</h2>
      <p>生日：{card.birthday}</p>
      <p>農曆生日：{card.lunar_birthday}</p>
      <p>生肖：{card.zodiac}</p>
      <p>星座：{card.constellation}</p>
      <p>血型：{card.blood_type}</p>
      <p>興趣：{card.hobbies}</p>
      <p>點數：{card.points}</p>

      <hr />
      <p style={{ color: "#888" }}>📌 最後感應時間：{card.last_seen || "尚未記錄"}</p>
    </div>
  );
}
