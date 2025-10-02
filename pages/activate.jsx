"use client";
import { useState, useEffect } from "react";

export default function ActivatePage() {
  const [status, setStatus] = useState("idle");
  const [form, setForm] = useState({ token: "", user_name: "", blood_type: "", hobbies: "", birth_time: "", d: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const d = params.get("d");
    if (token) setForm(prev => ({ ...prev, token }));
    if (d) setForm(prev => ({ ...prev, d }));
  }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/card-activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) setStatus(`❌ ${data.error||"開卡失敗"}`);
      else {
        setStatus("✅ 開卡成功！即將跳轉...");
        setTimeout(()=>{window.location.href=`/book?token=${form.token}`},1500);
      }
    } catch { setStatus("❌ 系統錯誤"); }
  };

  return (
    <div style={{padding:"2rem",textAlign:"center"}}>
      <h1>🎉 開卡手續</h1>
      <form onSubmit={handleSubmit}>
        <input placeholder="姓名/暱稱" name="user_name" value={form.user_name} onChange={handleChange} required/><br/>
        <select name="blood_type" value={form.blood_type} onChange={handleChange}>
          <option value="">血型</option><option>A</option><option>B</option><option>O</option><option>AB</option>
        </select><br/>
        <input placeholder="興趣嗜好" name="hobbies" value={form.hobbies} onChange={handleChange}/><br/>
        <input type="time" name="birth_time" value={form.birth_time} onChange={handleChange}/><br/>
        <button type="submit">{status==="loading"?"⏳ 開卡中...":"✅ 確認送出"}</button>
      </form>
      <p>{status!=="idle" && status}</p>
    </div>
  );
}
