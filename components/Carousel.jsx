"use client";
import { useState, useEffect, useRef } from "react";
import styles from "./Carousel.module.css";

export default function Carousel({ images = [] }) {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef(null);

  // 自動輪播控制
  useEffect(() => {
    const next = () => setIndex((prev) => (prev + 1) % images.length);
    timeoutRef.current = setTimeout(next, 5000);
    return () => clearTimeout(timeoutRef.current);
  }, [index, images.length]);

  const goTo = (i) => setIndex(i);
  const prev = () => setIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setIndex((i) => (i + 1) % images.length);

  return (
    <div className={styles.carousel}>
      <div
        className={styles.slides}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, i) => (
          <img key={i} src={src} alt={`slide-${i}`} />
        ))}
      </div>

      {/* 左右控制箭頭 */}
      <button className={`${styles.arrow} ${styles.left}`} onClick={prev}>
        ‹
      </button>
      <button className={`${styles.arrow} ${styles.right}`} onClick={next}>
        ›
      </button>

      {/* 下方指示點 */}
      <div className={styles.dots}>
        {images.map((_, i) => (
          <span
            key={i}
            className={`${styles.dot} ${i === index ? styles.active : ""}`}
            onClick={() => goTo(i)}
          ></span>
        ))}
      </div>
    </div>
  );
}