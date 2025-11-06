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
      <header className={styles.header}>
        <h1 className={styles.title}>NFC 生日書</h1>
        <p className={styles.subtitle}>感應智慧科技，開啟你的故事。</p>
      </header>

      {/* 第一區｜什麼是 NFC 生日書 */}
      <section className={`${styles.section} ${styles.fade}`}>
        <h2>🌅 誕生的意義</h2>
        <p>
          NFC 生日書是一份專屬於你的智慧禮物。  
          每張卡內含 NFC 感應晶片，結合現代科技與人文設計，  
          在每次感應之際，開啟屬於你的人生故事。
        </p>

        <Carousel
          images={[
            "/img/demo_quote.png",
            "/img/demo_brand.png",
            "/img/demo_intro.png",
          ]}
        />
        <p>
          這不是一本普通的『書』，而是一份『屬於你的人生記錄』。  
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
        <p>
          智慧科技模型會隨時間調整語氣與回饋，  
          如同一位導師、夥伴與陪伴者，  
          以最適合你的方式給予啟發與提醒。
        </p>
      </section>

      {/* 第三區｜生日送禮的最佳選擇 */}
      <section className={`${styles.section} ${styles.fade}`}>
        <h2>🎁 生日送禮的最佳選擇</h2>
        <h3 className={styles.highlight}>專屬・私密・安全</h3>
        <p>
          NFC 生日書結合實體卡片與安全憑證，  
          是一份能「保存、理解、分享」的時間禮物。
        </p>

        <div className={styles.grid3}>
          <div>
            <img src="/icons/nfc.png" alt="NFC" />
            <h3 className={styles.highlight}>NFC 感應卡片</h3>
            <p>專屬硬體識別，唯一序號；每次感應即產生新的存取動態碼，防止竊取。</p>
          </div>
          <div>
            <img src="/icons/lock.png" alt="安全" />
            <h3 className={styles.highlight}>個人隱私保護</h3> 
            <p>PIN 解鎖，僅本人可開啟；具時效性的生日書頁瀏覽，閒置即自動上鎖。</p>
          </div>
          <div>
            <img src="/icons/data.png" alt="輕量" />
            <h3 className={styles.highlight}>資料最小化</h3>
            <p>不留報告，只保存必要命盤；可以暱稱保存，無需綁定個資帳號。</p>
          </div>
        </div>
      </section>

      {/* 第四區｜探索人生（加值服務） */}
      <section className={`${styles.section} ${styles.fade}`}>
        <h2>🔮 探索人生</h2>
        <h3 className={styles.highlight}>智慧加值服務</h3>
        <h4 className={styles.subtitle}>
          從生日出發，持續探索自我成長的節奏。
        </h4>

        <p>
          NFC 生日書不僅是一份禮物，更是一套能隨時間成長的智慧系統。  
          透過「加值服務」，你可以解鎖更深入的個人報告、  
          訂閱每日行動建議、年度運勢與人格洞察；  
          延伸服務還包含 MBTI 職場測驗、  
          易經占卜、塔羅抽籤等豐富主題，讓探索變得有趣且實用。
        </p>
        <h4 className={styles.subtitle}>
          每一次感應，都是一次與自己的對話。
        </h4>

        <img
          src="/img/demo_mpc.png"
          alt="智慧引導模型"
          className={styles.heroImage}
        />

        <p>
          以「導師、夥伴、陪伴者」三角色模型為核心，  
          系統會根據你的節奏調整內容。  
          它不只是命理，而是一種溫柔而智慧的提醒。  
        </p>

        {/* 三角色簡介 */}
        <div className={styles.grid3}>
          <div>
            <img src="/icons/mentor.png" alt="導師" />
            <h3 className={styles.highlight}>導師</h3>
            <p>提供方向與洞察， <br/>幫助你理解人生節奏。</p>
            <p className={styles.dialogQuote}>
                妳有強烈的表達慾望與創造能量，同時也渴望被理解與認可。...
                今天，請勇敢說出妳心中的想法。妳的真誠，就是最有力量的起點。</p>
          </div>
          <div>
            <img src="/icons/partner.png" alt="夥伴" />
            <h3 className={styles.highlight}>夥伴</h3>
            <p>陪你面對選擇與挑戰， <br/>保持穩定與勇氣。</p>
            <p className={styles.dialogQuote}>
                你有掌控的慾望，也有分享的熱情。真正的力量，在於懂得給別人空間。...  
                今天的主題是節奏。在會議中多聽三秒再回答，你的判斷會因此更準確。</p>      
          </div>
          <div>
            <img src="/icons/companion.png" alt="陪伴者" />
            <h3 className={styles.highlight}>陪伴者</h3>
            <p>以溫柔語氣提醒， <br/>適時給予支持與安慰。</p>
            <p className={styles.dialogQuote}>
                你是行動派的思考者。經驗讓你更懂得取捨，也讓你學會溫柔地面對不確定。...
                今天適合慢下腳步，整理思緒而非衝刺。放過自己一點，才能走得更遠。</p>
          </div>
        </div>
      </section>

      {/* CTA 區｜結尾 */}
      <footer className={styles.footer}>
        <h3>🎂 讓「生日」成為被理解的一天</h3>
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
