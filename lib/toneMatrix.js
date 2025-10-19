// /lib/toneMatrix.js
// -----------------------------------------------
// 🧭 AI 行動建議語氣矩陣 Tone Matrix v1.0
// 作者：Roger Luo｜NFCTOGO 研究出版（2025.10）
// 用途：AI Daily Action 模型之語氣選擇引擎
// -----------------------------------------------

export const toneMatrix = {
  武曲: { 
    type: "action", 
    male: {
      tone: "堅定果斷，語氣沉穩具方向感。",
      sample: "今天不必急於結果，穩住節奏才是力量的展現。"
    },
    female: {
      tone: "果敢柔中帶剛，鼓勵而不壓迫。",
      sample: "相信自己的決定，妳的堅持正帶妳走向成果。"
    }
  },

  太陽: { 
    type: "balance", 
    male: {
      tone: "穩重鼓勵，理性中帶溫度。",
      sample: "保持節奏與清晰，行動會帶來答案。"
    },
    female: {
      tone: "溫柔領導，節奏穩而有光感。",
      sample: "妳的從容，就是最有力量的樣子。"
    }
  },

  廉貞: { 
    type: "intuition", 
    male: {
      tone: "直覺明快，語句富創造性。",
      sample: "今天的靈感值得嘗試，行動會讓它成真。"
    },
    female: {
      tone: "創意柔光，帶溫度的鼓勵感。",
      sample: "妳的創意值得被看見，勇敢表達自己的想法。"
    }
  },

  天同: { 
    type: "feeling", 
    male: {
      tone: "安靜陪伴，句尾柔軟。",
      sample: "不必急著回應世界，先安頓自己。"
    },
    female: {
      tone: "療癒細膩，語氣帶溫柔的餘韻。",
      sample: "別怕放慢，妳的節奏正好。"
    }
  },

  天機: { 
    type: "thinking", 
    male: {
      tone: "理性分析，語句清晰精準。",
      sample: "重新整理想法，再做決定也不遲。"
    },
    female: {
      tone: "清晰柔性，帶引導感的思考語氣。",
      sample: "花點時間梳理情緒，答案會更清楚。"
    }
  },

  紫微: { 
    type: "intuition", 
    male: {
      tone: "哲思啟發，語氣沉穩帶思索。",
      sample: "跟隨那股直覺，它正帶你靠近對的方向。"
    },
    female: {
      tone: "直覺柔光，浪漫而不虛浮。",
      sample: "妳的感覺是對的，試著相信那份預感。"
    }
  },
};

// 🧩 語氣選擇器
export function getToneProfile(ming_lord, gender = "男") {
  const data = toneMatrix[ming_lord];
  if (!data) {
    return {
      tone: "中性穩定語氣。",
      sample: "今天適合放慢步調，穩住心緒，迎接新方向。"
    };
  }
  return gender === "女" ? data.female : data.male;
}