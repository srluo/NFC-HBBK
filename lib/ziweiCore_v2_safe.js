// ------------------------------------------------------------
// ziweiCore_v2_safe.js
// 安全除錯版：用於檢查紫微命盤核心陣列載入狀態
// ------------------------------------------------------------
import {
  HeavenlyStems, EarthlyBranches, FiveElements,
  FiveEleArr, FiveEleTable,
  StarM_A14, StarM_A07, StarM_S04, StarM_B06,
  Star_A14, Star_Z06, Star_T08, Star_G07,
  Star_S04, Star_B06, Star_OS5
} from "./ziweiData_full.js";

function checkTable(name, t) {
  if (!t) return `${name} = undefined`;
  if (!Array.isArray(t)) return `${name} 不是陣列 (${typeof t})`;
  if (t.length === 0) return `${name} 長度為 0`;
  return null;
}

export function getZiweiCore(lunar, gender = "M") {
  const required = [
    "FiveEleTable","Star_Z06","Star_T08","Star_G07","Star_B06","Star_OS5"
  ];
  const missing = required
    .map(k => checkTable(k, eval(k)))
    .filter(Boolean);

  if (missing.length > 0) {
    return { error: "缺少資料表", missing };
  }

  try {
    const { year_ganzhi, month, day, hour_branch } = lunar;
    const yStem = year_ganzhi[0];
    const yBranch = year_ganzhi[1];

    const y1Pos = HeavenlyStems.indexOf(yStem);
    const y2Pos = EarthlyBranches.indexOf(yBranch);
    const hPos  = EarthlyBranches.indexOf(hour_branch);
    const m     = Number(month);
    const d     = Number(day);

    if (y1Pos < 0 || y2Pos < 0 || hPos < 0)
      return { error: "干支或時支無法識別", year_ganzhi, hour_branch };

    // 五行局
    const bureau = FiveElements[
      FiveEleArr[y1Pos % 5][ ((hPos - (hPos % 2 === 0 ? 0 : 1)) / 2) % 6 ]
    ] || "未知";

    // 檢查表索引安全性
    if (!FiveEleTable[FiveElements.indexOf(bureau)]) {
      return { error: "FiveEleTable 缺少對應行", bureau };
    }

    // 紫微起宮
    const z = EarthlyBranches[
      FiveEleTable[ FiveElements.indexOf(bureau) ][ d - 1 ]
    ];
    const zPos = EarthlyBranches.indexOf(z);

    // 防呆：表格長度檢查
    if (!Star_Z06[zPos]) return { error: "Star_Z06 索引超出", zPos };
    const sZ06 = Star_Z06[zPos];
    const tianfuPos = sZ06[6];

    if (!Star_T08[tianfuPos])
      return { error: "Star_T08 索引超出", tianfuPos };

    // 如果都沒錯，就代表表格都存在
    return {
      ok: true,
      bureau,
      z,
      zPos,
      check: "所有主要表格皆存在",
      sample: {
        FiveEleTable_row: FiveEleTable[0].slice(0, 5),
        Star_Z06_row: Star_Z06[0]?.slice(0, 5),
        Star_T08_row: Star_T08[0]?.slice(0, 5),
      }
    };

  } catch (err) {
    return { error: err.message, stack: err.stack.split("\n").slice(0, 4) };
  }
}