import {load} from 'cheerio';
const urls={first:'https://www.tff.org/Default.aspx?pageID=142',second:'https://www.tff.org/Default.aspx?pageID=976',third:'https://www.tff.org/Default.aspx?pageID=971',super:'https://www.tff.org/Default.aspx?pageID=198',official:'https://sports.core.api.espn.com/v2/sports/soccer/leagues/eng.1/events/401878755/competitions/401878755/officials',summary:'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/summary?event=401878755'};
export default async function handler(req,res){
 if(process.env.VERCEL_ENV!=='preview')return res.status(404).end();
 const k=String(req.query.source||'');if(!Object.hasOwn(urls,k))return res.status(400).end();
 try{const r=await fetch(urls[k],{signal:AbortSignal.timeout(15000)});if(!r.ok)return res.json({status:r.status});const b=await r.arrayBuffer();
 if(k==='official'||k==='summary'){const j=JSON.parse(new TextDecoder().decode(b));return res.json(k==='official'?j:{gameInfo:j.gameInfo,headerKeys:Object.keys(j.header?.competitions?.[0]||{}),officials:j.header?.competitions?.[0]?.officials});}
 let html=new TextDecoder('utf-8').decode(b);if(html.includes('\ufffd'))html=new TextDecoder('windows-1254').decode(b);const $=load(html),clean=s=>String(s||'').replace(/\s+/g,' ').trim();
 const tables=$('table').toArray().map(t=>{const rows=$(t).find('tr').filter((_,x)=>$(x).parents('table').first()[0]===t).toArray();return {id:$(t).attr('id'),class:$(t).attr('class'),n:rows.length,sample:rows.slice(0,3).map(tr=>$(tr).children('td,th').toArray().map(td=>({text:clean($(td).text()).slice(0,180),links:$(td).find('a').toArray().slice(0,4).map(a=>({t:clean($(a).text()),h:$(a).attr('href')})),img:$(td).find('img').first().attr('src')})))} }).filter(x=>x.n>3&&x.sample.some(row=>row.length>=4&&row.length<=20)).slice(0,15);
 const links=$('a').toArray().map(a=>({t:clean($(a).text()),h:$(a).attr('href')})).filter(x=>/grupID=|hafta=|macId=|macID=/i.test(x.h||'')).slice(0,110);
 return res.json({status:r.status,charset:r.headers.get('content-type'),title:$('title').text(),tables,links,selects:$('select').toArray().map(x=>({name:$(x).attr('name'),opts:$(x).find('option').toArray().slice(0,30).map(o=>({t:clean($(o).text()),v:$(o).attr('value')}))})).slice(0,8)});
 }catch(e){return res.json({error:String(e.message).slice(0,200)})}
}