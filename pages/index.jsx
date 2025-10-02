"use client";
import { useEffect } from "react";

export default function IndexPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("d");
    const uuid = params.get("uuid");
    if (!uuid) return;
    fetch(`/api/verify?d=${d}&uuid=${uuid}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "PENDING") {
          window.location.href = `/activate?token=${data.token}&d=${d}`;
        } else if (data.status === "ACTIVE") {
          window.location.href = `/book?token=${data.token}`;
        }
      });
  }, []);
  return <p style={{textAlign:"center",padding:"2rem"}}>⏳ 驗證中...</p>;
}
