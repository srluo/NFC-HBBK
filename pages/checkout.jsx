"use client";
import styles from "./book/book.module.css";
import Link from "next/link";

export default function Checkout() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>購買你的 NFC 生日書</h1>
        <p className={styles.subtitle}>
          Your Personal Story in One Touch — 溫暖又獨特的生日禮物。
        </p>
        <Link href="/intro" className={styles.backLink}>
          ⟵ 返回產品介紹
        </Link>
      </header>

      <section className={styles.section}>
        <h2>選擇版本</h2>
        <div className={styles.grid}>
          <div className={styles.panel}>
            <h3>Signature Edition</h3>
            <p>專屬生日綁定 + AI 命盤內容 + 禮盒包裝</p>
            <p><font className={styles.price}>NT$880</font></p>
            <button className={styles.buyBtn}>立即購買</button>
          </div>
          <div className={styles.panel}>
            <h3>Capsule Edition</h3>
            <p>通用卡 + 首次開卡綁定生日 + 數位內容啟用</p>
            <p><font className={styles.price}>NT$660</font></p>
            <button className={styles.buyBtn}>立即購買</button>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2>付款方式</h2>
        <ul>
          <li>Apple Pay / Google Pay</li>
          <li>信用卡（VISA / Master / JCB）</li>
          <li>LINE Pay / 街口支付</li>
        </ul>
      </section>

      <footer className={styles.footer}>
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