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

      const res = await fetch(`/api/verify?d=${d}&uuid=${uuid}`);
      const data = await res.json();

      if (data.error) {
        alert("驗證失敗：" + data.error);
        return;
      }

      if (data.status === "PENDING") {
        // 開卡流程
        router.push(`/activate?token=${data.token}&d=${d}`);
      } else if (data.status === "ACTIVE") {
        // 已開卡 → 直接展示生日書
        const uid = uuid.slice(0, 14);
        router.push(`/book?uid=${uid}`);
      }
    }

    checkVerify();
  }, [router]);

  return <p>驗證中，請稍候…</p>;
}
