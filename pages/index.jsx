"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const d = params.get("d");
      const uuid = params.get("uuid");
      if (!d || !uuid) return;

      try {
        const res = await fetch(`/api/verify?d=${d}&uuid=${uuid}`);
        const data = await res.json();

        if (data.error) {
          alert("驗證失敗：" + data.error);
          return;
        }

        if (data.status === "PENDING") {
          // ⏳ 尚未開卡 → 轉至 activate
          router.push(`/activate?token=${encodeURIComponent(data.token)}&d=${d}`);
        } else if (data.status === "ACTIVE") {
          // ✅ 已開卡 → 直接進入生日書頁
          const uid = uuid.slice(0, 14);
          router.push(`/book?uid=${uid}&token=${encodeURIComponent(data.token)}`);
        } else {
          alert("未知的卡片狀態：" + data.status);
        }
      } catch (err) {
        console.error("驗證錯誤:", err);
        alert("系統錯誤，請重新感應");
      }
    };

    run();
  }, [router]);

  return <p>⏳ 驗證中，請稍候…</p>;
}