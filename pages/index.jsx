"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function checkVerify() {
      const params = new URLSearchParams(window.location.search);
      const d = params.get("d");
      const uuid = params.get("uuid");
      if (!d || !uuid) return;

      try {
        const res = await fetch(`/api/verify?d=${d}&uuid=${uuid}`);
        const data = await res.json();

        // ❌ API 錯誤或未通過驗章
        if (!res.ok || data.error) {
          console.warn("[index.jsx] 驗證失敗:", data.error);
          setErrorMsg(data.error || "驗證失敗，請重新感應生日卡");
          return;
        }

        // ⚠️ 若 UID 不存在或非法卡
        if (data.next === "stop") {
          setErrorMsg(data.error || "非法卡片，請聯絡客服");
          return;
        }

        const token = data.token;

        // 🟡 未開卡
        if (data.next === "activate" || data.status === "PENDING") {
          router.push(`/activate?token=${token}&d=${d}`);
          return;
        }

        // 🟢 已開卡
        if (data.next === "book" || data.status === "ACTIVE") {
          // 判斷是否首次開啟
          try {
            const checkRes = await fetch(`/api/getCard?token=${token}`);
            const checkData = await checkRes.json();
            if (checkRes.ok && checkData.is_first_open) {
              router.push(`/book/first?token=${token}`);
            } else {
              router.push(`/book?token=${token}`);
            }
          } catch (e) {
            console.error("getCard 錯誤:", e);
            setErrorMsg("讀取卡片資料失敗，請稍後再試");
          }
          return;
        }

        // 🛑 其他未預期狀態
        setErrorMsg("無效回應，請重新感應生日卡。");
      } catch (err) {
        console.error("驗證錯誤:", err);
        setErrorMsg("系統錯誤，請稍後再試");
      }
    }

    checkVerify();
  }, [router]);

  return (
    <div style={{ textAlign: "center", marginTop: "3rem", fontFamily: "Microsoft JhengHei" }}>
      {errorMsg ? (
        <>
          <p style={{ fontSize: "1.2rem", color: "#d00", fontWeight: "bold" }}>⚠️ {errorMsg}</p>
          <p style={{ marginTop: "1rem" }}>請重新感應您的生日卡。</p>
        </>
      ) : (
        <p>🔄 驗證中，請稍候…</p>
      )}
    </div>
  );
}