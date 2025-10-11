import { solarToLunar } from "../../lib/lunarConverter.js";
import { getZiweiCore } from "../../lib/ziweiCore_v2.js";
export default async function handler(req, res) {
  const { birthcode } = req.method === "POST" ? req.body : req.query;
  const m = birthcode.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})-([FM])$/);
  if(!m){res.status(400).json({error:"格式錯誤"});return;}
  const [,y,M,d,hh,mm,g]=m;
  const lunar=await solarToLunar(+y,+M,+d,+hh,+mm);
  const result={demo:true,lunar};
  res.status(200).json({input:birthcode,parsed:{y,M,d,hh,mm,g},lunar,result});
}
