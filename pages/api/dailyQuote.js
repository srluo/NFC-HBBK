export default function handler(req, res) {
  const quotes = [
    "做自己命運的主人。— 莎士比亞",
    "成功的秘訣在於堅持。— 愛迪生",
    "未來取決於你今天的行動。— 甘地",
    "困難孕育奇蹟。— 貝多芬",
    "最大的風險是不冒任何風險。— 馬克·祖克伯",
    "別等機會，創造機會。— 喬治·萊斯特",
    "態度決定高度。— 魯迅",
    "相信自己，你比想像中更強大。"
  ];
  const random = quotes[Math.floor(Math.random() * quotes.length)];
  res.status(200).json({ quote: random });
}
