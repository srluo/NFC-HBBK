// ziweiCore_v2.js - Server-friendly Zi Wei Dou Shu core
// Imports: constants and tables extracted from the open-source project.
import {
  HeavenlyStems, EarthlyBranches, FiveElements, FiveEleArr, FiveEleTable,
  StarM_A14, StarM_A07, StarM_S04, StarM_B06,
  Star_A14, Star_Z06, Star_T08, Star_G07, Star_S04, Star_B06, Star_OS5
} from "./ziweiData_full.js";

function colAt(table, colIdx) {
  // returns an array of table[row][colIdx]
  return table.map(row => row[colIdx]);
}

function byPos(table, posArr) {
  return table.map((row, i) => row[ posArr[i] ]);
}

export function getZiweiCore(lunar, gender="M") {
  const { year_ganzhi, month, day, hour_branch } = lunar;
  const yStem = year_ganzhi[0];
  const yBranch = year_ganzhi[1];

  const y1Pos = HeavenlyStems.indexOf(yStem);
  const y2Pos = EarthlyBranches.indexOf(yBranch);
  const hPos  = EarthlyBranches.indexOf(hour_branch);
  const m     = Number(month);
  const d     = Number(day);

  // 命宮／身宮
  const l = EarthlyBranches[((12 - hPos) + 1 + m) % 12];
  const b = EarthlyBranches[(12 - ((22 - hPos) + 1 - m) % 12) % 12];
  const lPos = EarthlyBranches.indexOf(l);
  const bPos = EarthlyBranches.indexOf(b);

  // 五行局
  const bureau = FiveElements[ FiveEleArr[y1Pos % 5][ ((lPos - (lPos % 2 === 0 ? 0 : 1)) / 2) % 6 ] ];

  // 紫微起宮
  const z = EarthlyBranches[ FiveEleTable[ FiveElements.indexOf(bureau) ][ d - 1 ] ];
  const zPos = EarthlyBranches.indexOf(z);

  // 取星系 (依原演算法)
  const sZ06 = colAt(Star_Z06, zPos);     // 7 rows => 紫微系(前6) + 天府索引(第7)
  const tianfuPos = sZ06[6];
  const sT08 = colAt(Star_T08, tianfuPos); // 天府系 8 rows

  // 0:文昌 1:文曲 (時) 2:左輔 3:右弼 (月) 4:天魁 5:天鉞 6:祿存(年干)
  const sG07 = byPos(Star_G07, [hPos, hPos, m-1, m-1, y1Pos, y1Pos, y1Pos]);

  // 四化
  const sS04 = colAt(Star_S04, y1Pos);

  // 六凶：注意 Star_B06 混合維度
  const sB06 = [
    Star_B06[0][y1Pos],                       // 擎羊 (年干)
    Star_B06[1][y1Pos],                       // 陀羅 (年干)
    Star_B06[2][y2Pos][m-1],                  // 火星 (年支×月)
    Star_B06[3][y2Pos % 4][hPos],             // 鈴星 (年支(取模4)×時)
    Star_B06[4][hPos],                        // 天空 (時)
    Star_B06[5][hPos]                         // 地劫 (時)
  ];

  // 其他
  const sOS5 = colAt(Star_OS5, y2Pos);

  // 組 12 宮星曜
  const palaceStars = Array.from({length:12}, () => ({main:[], malefic:[], auspicious:[], others:[], s04:[]}));

  // 紫微(前6) + 六凶
  for (let k=0; k<6; k++) {
    const posA = sZ06[k];
    if (posA !== undefined) palaceStars[posA].main.push(StarM_A14[k]);
    const posB = sB06[k];
    if (posB !== undefined) palaceStars[posB].malefic.push(StarM_B06[k]);
  }

  // 天府系 (後8顆)
  for (let k=0; k<8; k++) {
    const pos = sT08[k];
    if (pos !== undefined) palaceStars[pos].main.push(StarM_A14[k+6]);
  }

  // 六吉 (文昌、文曲、左輔、右弼、天魁、天鉞、祿存)
  for (let k=0; k<7; k++) {
    const pos = sG07[k];
    if (pos !== undefined) palaceStars[pos].auspicious.push(StarM_A07[k]);
  }

  // 其他曜 (天馬、龍池、鳳閣、紅鸞、天喜)
  for (let k=0; k<5; k++) {
    const pos = sOS5[k];
    if (pos !== undefined) palaceStars[pos].others.push(StarO_S05[k] || "");
  }

  // 命宮主星群（即命宮裡的 main）
  const ming_branch = l;
  const shen_branch = b;

  const ming_main_stars = palaceStars[lPos].main.slice();

  // 命主/身主：簡化為各宮的第一顆主星；若無主星則取凶/吉中第一顆作代表
  const pickLord = (bucket) => {
    if (bucket.main.length) return bucket.main[0];
    if (bucket.auspicious.length) return bucket.auspicious[0];
    if (bucket.malefic.length) return bucket.malefic[0];
    if (bucket.others.length) return bucket.others[0];
    return "";
  };
  const ming_lord = pickLord(palaceStars[lPos]) || "（無）";
  const shen_lord = pickLord(palaceStars[bPos]) || "（無）";

  // 14 主星的具體宮位（以 zPos 起紫微 → Star_A14 相對表）
  // Star_A14[zPos] gives, for each palace index, array of star indices to place?
  // In original UI they combine via Star_Z06/Star_T08; already above in palaceStars.
  // Here we also output a flat map of 14 main star positions:
  const main14_positions = {};
  // We'll compute by scanning palaceStars for any main star names that match StarM_A14 set
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
