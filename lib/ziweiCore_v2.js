// ------------------------------------------------------------
// ziweiCore_v2_fixed.js - Server-friendly Zi Wei Dou Shu core
// ------------------------------------------------------------

// 安全導入資料表（防止 undefined 或空物件）
import * as z from "./ziweiData_full.js";


// 🧱 強制綁定常數（含 fallback），全部統一宣告一次
const HeavenlyStems   = z.HeavenlyStems   || ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const EarthlyBranches = z.EarthlyBranches || ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const FiveElements    = z.FiveElements    || ["水二局","火六局","土五局","木三局","金四局"];
const FiveEleArr      = z.FiveEleArr      || [[0,1,3,2,4,1],[1,2,4,3,0,2],[2,3,0,4,1,3],[3,4,1,0,2,4],[4,0,2,1,3,0]];
const FiveEleTable    = (z.FiveEleTable && z.FiveEleTable.length)
  ? z.FiveEleTable
  : [
      [1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,0,0,1,1,2,2,3,3,4],
      [9,6,11,4,1,2,10,7,0,5,2,3,11,8,1,6,3,4,0,9,2,7,4,5,1,10,3,8,5,6],
      [6,11,4,1,2,7,0,5,2,3,8,1,6,3,4,9,2,7,4,5,10,3,8,5,6,11,4,9,6,7],
      [4,1,2,5,2,3,6,3,4,7,4,5,8,5,6,9,6,7,10,7,8,11,8,9,0,9,10,1,10,11],
      [11,4,1,2,0,5,2,3,1,6,3,4,2,7,4,5,3,8,5,6,4,9,6,7,5,10,7,8,6,11]
    ];

const StarM_A14 = z.StarM_A14 || [];
const StarM_A07 = z.StarM_A07 || [];
const StarM_B06 = z.StarM_B06 || [];
const StarM_S04 = z.StarM_S04 || [];
const Star_A14 = z.Star_A14 || [];
const Star_Z06 = z.Star_Z06 || [];
const Star_T08 = z.Star_T08 || [];
const Star_G07 = z.Star_G07 || [];
const Star_S04 = z.Star_S04 || [];
const Star_B06 = z.Star_B06 || [];
const Star_OS5 = z.Star_OS5 || [];

function colAt(table, colIdx) {
  return table.map(row => row[colIdx]);
}
function byPos(table, posArr) {
  return table.map((row, i) => row[posArr[i]]);
}

// ------------------------------------------------------------
// 主函式
// ------------------------------------------------------------
export function getZiweiCore(lunar, gender="M") {
  const { year_ganzhi, month, day, hour_branch } = lunar;
  const yStem = year_ganzhi[0];
  const yBranch = year_ganzhi[1];

  const y1Pos = HeavenlyStems.indexOf(yStem);
  const y2Pos = EarthlyBranches.indexOf(yBranch);
  const hPos  = EarthlyBranches.indexOf(hour_branch);
  const m     = Number(month);
  const d     = Number(day);

  // 命宮、身宮
  const l = EarthlyBranches[((12 - hPos) + 1 + m) % 12];
  const b = EarthlyBranches[(12 - ((22 - hPos) + 1 - m) % 12) % 12];
  const lPos = EarthlyBranches.indexOf(l);
  const bPos = EarthlyBranches.indexOf(b);

  // 五行局
  const bureau = FiveElements[ FiveEleArr[y1Pos % 5][ ((lPos - (lPos % 2 === 0 ? 0 : 1)) / 2) % 6 ] ];

  // 起紫微
  const zBranch = EarthlyBranches[ FiveEleTable[ FiveElements.indexOf(bureau) ][ d - 1 ] ];
  const zPos = EarthlyBranches.indexOf(zBranch);

  // 紫微系 + 天府系
  const sZ06 = colAt(Star_Z06, zPos);
  const tianfuPos = sZ06[6] ?? 0;
  const sT08 = colAt(Star_T08, tianfuPos);

  // 六吉
  const sG07 = byPos(Star_G07, [hPos, hPos, m-1, m-1, y1Pos, y1Pos, y1Pos]);

  // 四化
  const sS04 = colAt(Star_S04, y1Pos);

  // 六凶
  const sB06 = [
    Star_B06[0]?.[y1Pos],
    Star_B06[1]?.[y1Pos],
    Star_B06[2]?.[y2Pos]?.[m-1],
    Star_B06[3]?.[y2Pos % 4]?.[hPos],
    Star_B06[4]?.[hPos],
    Star_B06[5]?.[hPos]
  ];

  const sOS5 = colAt(Star_OS5, y2Pos);
  const palaceStars = Array.from({length:12}, () => ({main:[], malefic:[], auspicious:[], others:[], s04:[]}));

  for (let k=0; k<6; k++) {
    const posA = sZ06[k];
    if (posA !== undefined) palaceStars[posA].main.push(StarM_A14[k]);
    const posB = sB06[k];
    if (posB !== undefined) palaceStars[posB].malefic.push(StarM_B06[k]);
  }
  for (let k=0; k<8; k++) {
    const pos = sT08[k];
    if (pos !== undefined) palaceStars[pos].main.push(StarM_A14[k+6]);
  }
  for (let k=0; k<7; k++) {
    const pos = sG07[k];
    if (pos !== undefined) palaceStars[pos].auspicious.push(StarM_A07[k]);
  }
  for (let k=0; k<5; k++) {
    const pos = sOS5[k];
    if (pos !== undefined) palaceStars[pos].others.push(Star_OS5[k]);
  }

  const ming_branch = l;
  const shen_branch = b;
  const ming_main_stars = palaceStars[lPos].main.slice();

  const pickLord = (bucket) => {
    if (bucket.main.length) return bucket.main[0];
    if (bucket.auspicious.length) return bucket.auspicious[0];
    if (bucket.malefic.length) return bucket.malefic[0];
    if (bucket.others.length) return bucket.others[0];
    return "";
  };
  const ming_lord = pickLord(palaceStars[lPos]) || "（無）";
  const shen_lord = pickLord(palaceStars[bPos]) || "（無）";

  const main14_positions = {};
  for (let i=0;i<12;i++){
    for (const s of palaceStars[i].main) {
      if (StarM_A14.includes(s)) {
        main14_positions[s] = EarthlyBranches[i];
      }
    }
  }

  return {
    bureau,
    ming_branch,
    shen_branch,
    ming_lord,
    shen_lord,
    ming_main_stars,
    main14_positions,
    palaceStars
  };
}