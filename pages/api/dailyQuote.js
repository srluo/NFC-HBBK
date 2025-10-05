// /pages/api/dailyQuote.js

export default function handler(req, res) {
  const quotes = [
    "🌿 今天請記得對自己溫柔一點。",
    "☀️ 勇敢踏出第一步，奇蹟才會發生。",
    "💡 保持好奇心，世界會為你打開新的門。",
    "🌸 一點一滴的努力，會在未來綻放成花。",
    "✨ 不用完美，只要堅持前進。",
    "🔥 相信自己，沒有什麼不可能。",
    "💎 真誠是最有力量的禮物。",
    "📅 今天的你，也值得被愛與肯定。",
    "🍀 放下焦慮，接納當下，幸福就在身邊。",
    "🌊 面對挑戰時，記得你比想像中更堅強。"
  ];

  const randomIndex = Math.floor(Math.random() * quotes.length);
  const quote = quotes[randomIndex];

  res.status(200).json({ quote });
}