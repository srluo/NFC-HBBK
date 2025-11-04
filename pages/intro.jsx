"use client";
import { useEffect } from "react";
import styles from "./book/book.module.css";
import Link from "next/link";
import Carousel from "../components/Carousel";

export default function Intro() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add(styles.visible);
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(`.${styles.fade}`).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.container}>
      {/* 第一區｜什麼是 NFC 生日書 */}
      <section className={`${styles.section} ${styles.fade}`}>
        <h2>🌅 誕生的意義</h2>
        <p>
          NFC 生日書是一份專屬於你的智慧禮物。  
          每張卡內含 NFC 感應晶片，結合現代科技與溫度設計，  
          感應之間，開啟屬於你的人格故事。
        </p>

        {/* 新版 React 輪播 */}
        <Carousel
          images={[
            "/img/demo_quote.png",
            "/img/demo_brand.png",
            "/img/demo_intro.png",
          ]}
        />
        <p>
          這不是一本普通的書，而是一份「屬於你的人格記錄」。  
          從生日開始，它記下你的特質、節奏與潛能，  
          是每個階段都能重新開啟的時間膠囊。
        </p>
      </section>

      {/* 第二區｜人格資料宇宙 */}
      <section className={`${styles.section} ${styles.fade}`}>
        <h2>🧭 你的智慧人生羅盤</h2>
        <h3 className={styles.highlight}>人格資料宇宙</h3>
        <p>
          我們相信，每個生日都是一顆星。  
          系統將你的生日轉化為「人格宇宙」中的一個節點，  
          在無數資料之中，找到屬於你的節奏與軌跡。
        </p>
        <img
          src="/img/demo_universe.png"
          alt="人格資料宇宙"
          className={styles.heroImage}
        />
          智慧科技模型會隨時間調整語氣與回饋，  
          如同一位導師、夥伴與陪伴者，  
          以最適合你的方式給予啟發與提醒。
      </section>

      {/* 第三區｜生日送禮的最佳選擇 */}
      <section className={`${styles.section} ${styles.fade}`}>
        <h2>生日送禮的最佳選擇</h2>
        <h3 className={styles.highlight}>專屬・私密・安全</h3>
        <p>
          NFC 生日書結合實體卡片與安全憑證，  
          是一份能「保存、理解、分享」的時間禮物。
        </p>

        <div className={styles.grid3}>
          <div>
            <img src="/icons/nfc.png" alt="NFC" />
            <p><strong>NFC 感應卡片</strong><br/>專屬硬體識別，唯一序號</p>
            </div>
            <div>
            <img src="/icons/lock.png" alt="安全" />
            <p><strong>個人隱私保護</strong><br/>PIN 解鎖，僅本人可開啟</p>
            </div>
            <div>
            <img src="/icons/data.png" alt="輕量" />
            <p><strong>資料最小化</strong><br/>不留報告，只保存必要命盤</p>
            </div>
        </div>
      </section>

      {/* CTA 區｜結尾 */}
      <footer className={styles.footer}>
        <h3>🎁 讓「生日」成為被記錄與理解的一天</h3>
        <button
          className={`${styles.footerBtn} ${styles.buyBtn}`}
          onClick={() => window.open("/checkout", "_blank")}
        >
          ✨ 我想擁有我的生日書
        </button>
        <button
          className={`${styles.footerBtn} ${styles.siteBtn}`}
          onClick={() => window.open("https://www.nfctogo.com", "_blank")}
        >
          🌐 前往 NFCTOGO 官網
        </button>
        <p className={styles.copy}>©2025 NFC靈動生日書 · Powered by NFCTOGO</p>
      </footer>
    </div>
  );
}