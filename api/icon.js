import sharp from 'sharp';
import path from 'node:path';
const image=path.join(process.cwd(),'icons','tribun.webp');
const cache=new Map();
export default async function handler(req,res){
 const s=[180,192,512].includes(+req.query.s)?+req.query.s:192;
 const mask=req.query.mask==='1';
 const key=s+':'+mask;
 try{
  if(!cache.has(key)){
   const inner=mask?Math.round(s*.76):s;
   let png=sharp(image).resize(inner,inner,{fit:'fill'});
   if(mask){const left=Math.floor((s-inner)/2),right=s-inner-left;png=png.extend({top:left,bottom:right,left,right,background:'#06111b'});}
   cache.set(key,await png.png().toBuffer());
  }
  res.setHeader('Content-Type','image/png');res.setHeader('Cache-Control','public, max-age=3600, s-maxage=86400');
  return res.status(200).send(cache.get(key));
 }catch{return res.status(500).json({error:'icon_unavailable'});}
}
