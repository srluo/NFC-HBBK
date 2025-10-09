// /lib/ziwei_core_v1.57.js
// 前端可直接使用：取得農曆 + 紫微核心欄位 + AI seed
// 用法：
//   import { buildZiweiSeed } from "@/lib/ziwei_core_v1.57";
//   const out = await buildZiweiSeed({ ymd: "1962-04-09", timeLabel: "亥時", gender: "F", blood: "B" });

const HOUR_TO_BRANCH = {
  "子時": "子","丑時": "丑","寅時": "寅","卯時": "卯","辰時": "辰","巳時": "巳",
  "午時": "午","未時": "未","申時": "申","酉時": "酉","戌時": "戌","亥時": "亥",
};

// 12 型（先天人格）按月份：1~12
const INNATE_12 = [
  null, "創始者", "築夢者", "橋接者", "守護者", "燃燒者", "工藝者",
  "組織者", "凝聚者", "拓荒者", "整合者", "策士", "領航者"
];

// 生命靈數（生日 YYYYMMDD 相加；11/22 master 保留，不出 33）
function calcLifeNumber(ymd) {
  const s = ymd.replace(/-/g, "");
  let n = [...s].reduce((a, c) => a + Number(c), 0);
  const reduce = (x) => {
    while (x > 9 && x !== 11 && x !== 22) {
      x = String(x).split("").reduce((a, c) => a + Number(c), 0);
    }
    return x;
  };
  const masterNumber = (n === 11 || n === 22) ? n : null;
  n = reduce(n);
  return { number: n, masterNumber };
}

// 西曆 → 農曆（走你自己的 API，避免 CORS）
async function fetchLunar(ymd) {
  const res = await fetch(`/api/lunar?date=${ymd}`);
  if (!res.ok) throw new Error("lunar api error");
  return res.json(); // { lunar, animal, ganzhi, month_no, is_leap, term }
}

// 紫微核心（命宮/身宮/五行局/命主/身主/命宮主星），走後端演算法保持一致性
async function fetchZiweiCore({ ymd, hourLabel }) {
  const res = await fetch(`/api/ziwei-core`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ymd, hourLabel }),
  });
  if (!res.ok) throw new Error("ziwei core api error");
  return res.json(); // { ming_branch, shen_branch, bureau, ming_lord, shen_lord, ming_stars: [...] }
}

// 星座（西曆）
function calcConstellation(ymd) {
  const m = Number(ymd.slice(5,7)), d = Number(ymd.slice(8,10));
  const list = [
    ["摩羯", 1,19],["水瓶", 2,18],["雙魚", 3,20],["牡羊", 4,19],["金牛", 5,20],["雙子", 6,21],
    ["巨蟹", 7,22],["獅子", 8,22],["處女", 9,22],["天秤",10,23],["天蠍",11,22],["射手",12,21],["摩羯",12,31],
  ];
  for (let i=0;i<list.length-1;i++){
    const [name, mm, dd] = list[i];
    const [_, nm, nd] = list[i+1];
    const inRange =
      (m===mm && d>=dd) || (m===nm && d<=nd);
    if (inRange) return name;
  }
  return "摩羯";
}

// AI seed（整合）
export async function buildZiweiSeed({ ymd, timeLabel, gender="U", blood="", city="" }) {
  const hourBranch = HOUR_TO_BRANCH[timeLabel] || "子";

  // 1) 取農曆
  const lunar = await fetchLunar(ymd);
  // 2) 紫微核心
  const z = await fetchZiweiCore({ ymd, hourLabel: timeLabel });
  // 3) 生命靈數 / 星座 / 先天12型
  const ln = calcLifeNumber(ymd);
  const constellation = calcConstellation(ymd);
  const innate = INNATE_12[Number(ymd.slice(5,7))];

  // 4) AI seed 組裝
  const ai_seed = {
    meta: {
      solar_date: ymd,
      lunar_text: lunar.lunar, // 例：壬寅年 三月初五
      zodiac_cn: lunar.animal, // 例：虎
      ganzhi_year: lunar.ganzhi, // 例：壬寅
      month_no: lunar.month_no, // 1~12
      term: lunar.term || "",
      is_leap: !!lunar.is_leap,
      city,
      gender,
      blood,
    },
    profile: {
      constellation,          // 星座（西）
      life_number: ln.masterNumber || ln.number, // 11/22 保留
      innate_12: innate,      // 先天 12 型
      ziwei: {
        ming_gong: z.ming_branch,     // 命宮地支
        shen_gong: z.shen_branch,     // 身宮地支
        bureau: z.bureau,             // 五行局
        ming_lord: z.ming_lord,       // 命主
        shen_lord: z.shen_lord,       // 身主
        ming_stars: z.ming_stars,     // 命宮主星陣列
      }
    },
    // 供生成摘要的 Prompt 片段
    prompt_seed: [
      `性別：${gender==='M'?'男':gender==='F'?'女':'未填'}, 血型：${blood||'未填'}, 出生地：${city||'未填'}`,
      `西曆生日：${ymd}（${timeLabel}）｜農曆：${lunar.lunar}（${lunar.ganzhi}年, 生肖${lunar.animal}）`,
      `星座：${constellation}｜生命靈數：${ln.masterNumber || ln.number}｜先天12型：${innate}`,
      `紫微：命宮${z.ming_branch}｜身宮${z.shen_branch}｜五行局：${z.bureau}｜命主：${z.ming_lord}｜身主：${z.shen_lord}｜命宮主星：${z.ming_stars.join("、")}`
    ].join("\n")
  };

  return ai_seed;
}