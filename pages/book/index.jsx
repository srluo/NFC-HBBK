"use client";
import { useState, useEffect } from "react";
import styles from "./book.module.css";
import { zodiacMap, constellationMap } from "../../lib/iconMap";

export default function Book() {
  const [status, setStatus] = useState("loading");
  const [card, setCard] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) {
      setStatus("❌ 缺少 token 參數");
      return;
    }

    async function fetchCard() {
      try {
        const res = await fetch(`/api/getCard?token=${token}`);
        const data = await res.json();
        if (!res.ok || data.error) {
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
            src={`/icons/constellation/${constellationMap[card.constellation] || "default"}.svg`}
            alt={card.constellation}
            className={styles.icon}
            onError={(e) => { e.target.src = "/icons/default.svg"; }}
          />
          <img
            src={`/icons/zodiac/${zodiacMap[card.zodiac] || "default"}.svg`}
            alt={card.zodiac}
            className={styles.icon}
            onError={(e) => { e.target.src = "/icons/default.svg"; }}
          />
        </div>

        <h3 className={styles.title}>{card.user_name || "未命名"}</h3>
        <p className={styles.paragraph}>生日：{card.birthday}</p>
        <p className={styles.paragraph}>農曆生日：{card.lunar_birthday}</p>
        <p className={styles.paragraph}>生肖：{card.zodiac}</p>
        <p className={styles.paragraph}>星座：{card.constellation}</p>
        <p className={styles.paragraph}>血型：{card.blood_type}</p>
        <p className={styles.paragraph}>嗜好：{card.hobbies}</p>
        <p className={styles.paragraph}>出生時辰：{card.birth_time}</p>
        <hr />
        <p className={styles.paragraph}>
          目前點數：<strong>{card.points}</strong>
        </p>
      </div>
    </div>
  );
}
