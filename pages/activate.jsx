"use client";
import { useState, useEffect } from "react";

export default function Activate() {
  const [status, setStatus] = useState("idle");
  const [form, setForm] = useState({
    token: "",
    user_name: "",
    birthday: "",
    blood_type: "",
    hobbies: "",
    birth_time: ""
  });

  // 自動帶入 URL 上的 d=生日 與 token
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const d = urlParams.get("d") || "";
    const token = urlParams.get("token") || "";
    setForm((prev) => ({
      ...prev,
      birthday: d,   // ✅ 自動填生日
      token          // ✅ 自動填 Token
    }));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/card-activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
