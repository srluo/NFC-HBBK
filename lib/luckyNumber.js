// /lib/luckyNumber.js — v1.8.0-stable
// 🎯 計算生命靈數（支援 11 / 22 / 33 大師數）
// ----------------------------------------------------
// 🔹 輸入：YYYYMMDD (string)，例如 "19650404"
// 🔹 回傳：{ lucky_number: "11（大師數）", lucky_desc: "..." }
// ----------------------------------------------------

export function getLuckyNumber(dateStr) {
  // 🧩 安全防呆：長度不符直接回傳空
  if (!dateStr || typeof dateStr !== "string" || dateStr.length !== 8) {
    return { lucky_number: "", lucky_desc: "" };
  }

  // ① 拆解為數字陣列
  let digits = dateStr.split("").map((d) => parseInt(d, 10));
  let sum = digits.reduce((a, b) => a + b, 0);

  // ② 持續相加直到為一位數或大師數
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum
      .toString()
      .split("")
      .reduce((a, b) => a + parseInt(b, 10), 0);
  }

  // ③ 判斷是否為大師數
  const masterNumber = [11, 22, 33].includes(sum) ? sum : null;

  // ④ 最終生命靈數
  const number = masterNumber ? (sum === 33 ? 6 : Math.floor(sum / 11)) : sum;

  // ⑤ 對應描述
  const descMap = {
    1: "獨立與領導，天生的開創者。",
    2: "敏銳直覺，重視合作與關係平衡。",
    3: "創意豐富，擅長表達與溝通。",
    4: "穩定務實，重視秩序與安全感。",
    5: "熱愛自由，勇於嘗試新事物。",
    6: "關愛他人，重視家庭與責任感。",
    7: "思考深邃，追求真理與知識。",
    8: "具企圖心，重視權力與成就。",
    9: "心懷世界，富有慈悲與理想性。",
    11: "擁有強烈直覺與靈性洞察力。",
    22: "擁有宏觀願景與實踐大夢的能力。",
    33: "具有療癒能量與無私奉獻精神。",
  };

  // ⑥ 組合輸出格式
  const lucky_number = masterNumber
    ? `${masterNumber}（大師數）`
    : `${number}`;
  const lucky_desc = descMap[masterNumber || number] || "";

  return { lucky_number, lucky_desc };
}