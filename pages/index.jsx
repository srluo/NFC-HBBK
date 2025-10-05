"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function checkVerify() {
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

        const token = data.token;

        if (data.status === "PENDING") {
          // 🟡 未開卡 → 跳轉 activate
          router.push(`/activate?token=${token}&d=${d}`);
        } else if (data.status === "ACTIVE") {
          // 🟢 已開卡 → 先查 getCard 判斷是否首次開啟
          const checkRes = await fetch(`/api/getCard?token=${token}`);
          const checkData = await checkRes.json();

          if (checkRes.ok && checkData.is_first_open) {
            // 🎁 首次開啟 → 跳轉禮物卡頁面
            router.push(`/book/first?token=${token}`);
          } else {
            // 🔄 之後 → 一般卡片頁
            router.push(`/book?token=${token}`);
          }
        }
      } catch (err) {
        console.error("驗證錯誤:", err);
      }
    }

    checkVerify();
  }, [router]);

  return <p>驗證中，請稍候…</p>;
}
