// /pages/index.jsx — v1.8.5-stable (HB-LogicReady)
"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function checkVerify() {
      const params = new URLSearchParams(window.location.search);
      const d = params.get("d");
      const uuid = params.get("uuid");
      if (!d || !uuid) {
        setErrorMsg("缺少參數，請重新感應卡片");
        return;
      }

      try {
        // Step 1️⃣ 驗章
        const res = await fetch(`/api/verify?d=${d}&uuid=${uuid}`);
        const data = await res.json();

        if (!res.ok || !data.ok) {
          console.warn("[index.jsx] 驗證失敗:", data.error);
          setErrorMsg(data.error || "驗證失敗，請重新感應生日卡");
          return;
        }

        const { token, status, variant } = data;

        // Step 2️⃣ 狀態導向邏輯（HB 準則）
        if (status === "PENDING") {
          // ✅ 未啟用 → 開卡頁
          if (d === "00000000") console.log(`[index.jsx] Capsule (UNBOUND) card detected.`);
          router.push(`/activate?token=${token}&d=${d}`);
        } else if (status === "ACTIVE") {
          // ✅ 已啟用 → 判斷首次開啟
          const checkRes = await fetch(`/api/getCard?token=${token}`);
          const checkData = await checkRes.json();

          if (checkRes.ok && checkData.is_first_open) {
            router.push(`/book/first?token=${token}`);
          } else {
            router.push(`/book?token=${token}`);
          }
        } else {
          // 非預期狀態
          console.warn("[index.jsx] 狀態異常:", status, variant);
          setErrorMsg("卡片狀態異常，請重新感應卡片");
        }

      } catch (err) {
        console.error("[index.jsx] 驗證錯誤:", err);
        setErrorMsg("系統錯誤，請重新感應生日卡 📱");
      }
    }

    checkVerify();
  }, [router]);

  return (
    <div style={{
      textAlign: "center",
      marginTop: "3rem",
      fontFamily: "Microsoft JhengHei",
      color: "#222",
    }}>
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