// /lib/luckyNumber.js — v1.7.9-enhanced
// 🎯 計算生命靈數（支援 11 / 22 / 33 大師數）
// ----------------------------------------------------
// 🔹 輸入：YYYYMMDD (string)，例如 "19650404"
// 🔹 回傳：{ number: 6, masterNumber: 33 }
// 🔹 邏輯：
//   1. 將出生年月日八位數拆成個位數相加。
//   2. 若總和 > 9，持續拆解相加（digit-sum）。
//   3. 若遇到 11 / 22 / 33，視為「大師數」（不再拆解）。
//   4. 33 的潛在振動歸屬於 6（愛與責任）。
// ----------------------------------------------------

export function getLuckyNumber(dateStr) {
  // 🧩 安全防呆：長度不符直接回傳空
  if (!dateStr || typeof dateStr !== "string" || dateStr.length !== 8) {
    return { number: null, masterNumber: null };
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

  // ④ 計算最終生命靈數
  //    - 若為大師數仍顯示對應主題，但 number 對應基礎振動
  //    - 33 通常視為 6 的高振動（關愛、療癒）
  const number = masterNumber ? (sum === 33 ? 6 : Math.floor(sum / 11)) : sum;

  return { number, masterNumber };
}
