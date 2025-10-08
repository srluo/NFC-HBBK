export function getLuckyNumber(e) {
  if (!e) return { masterNumber: null, number: null };
  const str = String(e).replace(/-/g, "").replace(/\s/g, "");
  const digits = str.split("").map(Number).filter(n => !isNaN(n));

  if (digits.length === 0) return { masterNumber: null, number: null };

  let n = digits.reduce((a, b) => a + b, 0);
  while (n > 9 && ![11, 22, 33].includes(n)) {
    n = String(n).split("").map(Number).reduce((a, b) => a + b, 0);
  }

  return { masterNumber: [11, 22, 33].includes(n) ? n : null, number: n };
}