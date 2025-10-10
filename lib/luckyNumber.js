// /lib/luckyNumber.js
// 🎯 計算生命靈數（支援 33 例外）
// - 輸入: YYYYMMDD (string)
// - 輸出: { number: 6, masterNumber: 33 }

export function getLuckyNumber(dateStr) {
  if (!dateStr || dateStr.length !== 8) {
    return { number: null, masterNumber: null };
  }

  // 拆解數字
  let digits = dateStr.split("").map((d) => parseInt(d, 10));
  let sum = digits.reduce((a, b) => a + b, 0);

  // 若總和大於 9，持續相加直到剩個位數或 11 / 22 / 33
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum
      .toString()
      .split("")
      .reduce((a, b) => a + parseInt(b, 10), 0);
  }

  // 回傳主數與是否為大師數
  const masterNumber = [11, 22, 33].includes(sum) ? sum : null;
  const number = masterNumber ? (sum === 33 ? 6 : sum / 11) : sum; // 33 視為 6，大師數另外標註

  return { number, masterNumber };
}