"use client";
import { useState, useEffect, useRef } from "react";
import styles from "./Carousel.module.css";

export default function Carousel({ images = [] }) {
  const [index, setIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null); // 新增：放大預覽
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

  // Esc 關閉預覽
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setSelectedImage(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div className={styles.carousel}>
      {/* 輪播主體 */}
      <div
        className={styles.slides}
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`slide-${i}`}
            onClick={() => setSelectedImage(src)} // 點擊放大
            className={styles.slideImage}
          />
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

      {/* 放大預覽層 */}
      {selectedImage && (
        <div
          className={styles.lightboxOverlay}
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Preview"
            className={styles.lightboxImage}
          />
        </div>
      )}
    </div>
  );
}