"use client";
import { useEffect, useState } from "react";

function BirthdayBook({ card }) {
  return <div style={{padding:"2rem"}}><h1>🎂 {card.user_name} 的生日書</h1><p>生日: {card.birthday}</p><p>農曆: {card.lunar_birthday}</p><p>生肖: {card.zodiac}</p><p>星座: {card.constellation}</p><p>血型: {card.blood_type}</p><p>興趣: {card.hobbies}</p><p>出生時間: {card.birth_time}</p><p>點數: {card.points}</p></div>;
}

function BookWallet({ card }) {
  return <div style={{padding:"2rem",textAlign:"center"}}><h2>📕 生日書縮圖</h2><div style={{width:"200px",height:"280px",margin:"1rem auto",background:"#f5f5f5",border:"1px solid #ddd"}}>封面</div><p>點數餘額：{card.points}</p></div>;
}

export default function BookPage() {
  const [status,setStatus] = useState("loading");
  const [card,setCard] = useState(null);
  const [isFirstOpen,setIsFirstOpen] = useState(false);

  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if(!token){setStatus("❌ 缺少 token");return;}
    fetch(`/api/getCard?token=${token}`)
      .then(res=>res.json())
      .then(data=>{ if(data.error) setStatus("❌ "+data.error); else { setCard(data.card); setIsFirstOpen(data.is_first_open); setStatus("ready");}})
      .catch(()=>setStatus("❌ 系統錯誤"));
  },[]);

  if(status==="loading") return <p>⏳ 載入中...</p>;
  if(status!=="ready") return <p>{status}</p>;
  return isFirstOpen?<BirthdayBook card={card}/>:<BookWallet card={card}/>;
}
