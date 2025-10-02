"use client";
import { useState, useEffect } from "react";
import styles from "./book.module.css";

export default function Book() {
  const [status, setStatus] = useState("loading");
  const [card, setCard] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get("uid");
    const token = urlParams.get("token");

    if (!uid || !token) {
      setStatus("❌ 缺少必要參數");
      return;
    }

    async function fetchCard() {
      try {
        const res = await fetch(`/api/getCard?uid=${uid}&token=${token}`);
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setStatus(`❌ 錯誤: ${data.error || "讀取失敗"}`);
        } else {
          setCard(data.card);
          setStatus("ok");
        }
      } catch (err) {
        console.error(err);
        setStatus("❌ 系統錯誤");
      }
    }

    fetchCard();
  }, []);

  if (status === "loading") return <p className={styles.loading}>⏳ 載入中...</p>;
  if (status !== "ok") return <p className={styles.error}>{status}</p>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconBox}>
          <img
            src={`/icons/constellation/${card.constellation}.svg`}
            alt={card.constellation}
            className={styles.icon}
            onError={(e) => { e.target.src = "/icons/default.svg"; }}
          />
          <img
            src={`/icons/zodiac/${card.zodiac}.svg`}
            alt={card.zodiac}
            className={styles.icon}
            onError={(e) => { e.target.src = "/icons/default.svg"; }}
          />
        </div>

        <h3>{card.user_name || "未命名"}</h3>
        <p>生日：{card.birthday}</p>
        <p>農曆生日：{card.lunar_birthday}</p>
        <p>生肖：{card.zodiac}</p>
        <p>星座：{card.constellation}</p>
        <p>血型：{card.blood_type}</p>
        <p>嗜好：{card.hobbies}</p>
        <p>出生時辰：{card.birth_time}</p>
        <hr />
        <p>目前點數：<strong>{card.points}</strong></p>
      </div>
    </div>
  );
}
