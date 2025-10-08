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
      if (!d || !uuid) return;

      try {
        const res = await fetch(`/api/verify?d=${d}&uuid=${uuid}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          console.warn("[index.jsx] 驗證失敗:", data.error);
          setErrorMsg(data.error || "驗證失敗，請重新感應生日卡");
          return;
        }

        const token = data.token;
        if (data.status === "PENDING") {
          router.push(`/activate?token=${token}&d=${d}`);
        } else if (data.status === "ACTIVE") {
          const checkRes = await fetch(`/api/getCard?token=${token}`);
          const checkData = await checkRes.json();

          if (checkRes.ok && checkData.is_first_open) {
            router.push(`/book/first?token=${token}`);
          } else {
            router.push(`/book?token=${token}`);
          }
        }
      } catch (err) {
        console.error("驗證錯誤:", err);
        setErrorMsg("系統錯誤，請重新感應生日卡 📱");
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