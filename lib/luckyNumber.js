// lib/luckyNumber.js

/**
 * 計算生日對應的生命靈數（幸運數字）
 * @param {string} birthday - 格式為 YYYY-MM-DD
 * @returns {{ masterNumber: number|null, number: number|null }}
 */
export function getLuckyNumber(birthday) {
  if (!birthday) return { masterNumber: null, number: null };

  const digits = birthday.replace(/-/g, '').split('').map(Number);
  let sum = digits.reduce((a, b) => a + b, 0);

  // 若第一次總和為大師數字 → 保留
  if ([11, 22, 33].includes(sum)) {
    return { masterNumber: sum, number: sum };
  }

  // 否則進行一般縮減直到為個位數
  while (sum > 9) {
    const tempDigits = String(sum).split('').map(Number);
    sum = tempDigits.reduce((a, b) => a + b, 0);
    if ([11, 22, 33].includes(sum)) {
      return { masterNumber: sum, number: sum };
    }
  }

  return { masterNumber: null, number: sum };
}