// Basketball preferences and match phases are separate from football.
export const BASKET_LEAGUES=['nba','mens-college-basketball','wnba','as-el','as-ec'];
export const BASKET_ROUTES={nba:19,'as-el':21,'as-ec':22,'mens-college-basketball':29,wnba:30};
export const BASKET_TYPES=['start','half','end','reminder','period'];
export const basketPrefs=p=>Object.fromEntries(BASKET_TYPES.map(k=>[k,typeof p?.[k]==='boolean'?p[k]:k==='end']));
export function basketKeys(a){
 return [...new Set((Array.isArray(a)?a:[]).filter(v=>typeof v==='string'&&/^(?:nba|wnba|mens-college-basketball|as-el|as-ec):[A-Za-z0-9]{1,24}$/.test(v)))].slice(0,200);
}
export const basketFollows=(s,e)=>(s.bfm||[]).includes(e.lg+':'+e.id)||(s.bft||[]).includes(e.lg+':'+e.hid)||(s.bft||[]).includes(e.lg+':'+e.aid);
export const basketWants=(s,e,k)=>basketFollows(s,e)&&basketPrefs(s.bprefs)[k]===true;
const score=x=>x===null||x===undefined||x===''?null:Number.isInteger(Number(x))&&Number(x)>=0&&Number(x)<=400?Number(x):null;
export function mapBasket(e,lg){
 const c=e.competitions?.[0],s=e.status||c?.status,t=s?.type||{},teams=c?.competitors||[],h=teams.find(x=>x.homeAway==='home'),a=teams.find(x=>x.homeAway==='away');
 if(!h||!a||!/^\d+$/.test(String(e.id))||!['pre','in','post'].includes(t.state))return null;
 const home=t.state==='pre'?0:score(h.score),away=t.state==='pre'?0:score(a.score);
 if(home===null||away===null)return null;
 const status=String(t.name||''),half=/HALFTIME|HALF_TIME/i.test(status)||/^HT$|^Halftime$/i.test(t.shortDetail||'');
 const final=t.state==='post'&&t.completed===true&&!/CANCEL|POSTPON|ABANDON|SUSPEND|FORFEIT/i.test(status);
 if(t.state==='post'&&!final)return null;
 const period=Number(s.period)||0;
 return {lg,id:String(e.id),hid:String(h.team?.id||''),aid:String(a.team?.id||''),hn:h.team?.shortDisplayName||h.team?.displayName||'Ev sahibi',an:a.team?.shortDisplayName||a.team?.displayName||'Deplasman',state:t.state,home,away,half,final,period,periodEnded:/END_(?:OF_)?PERIOD|END_(?:OF_)?QUARTER/i.test(status)||/^End of /i.test(t.shortDetail||''),kickoff:Date.parse(e.date||c?.date||'')};
}
export function mapEuroBasket(e){
 if(!e.verifiedFinal&&!e.verifiedLive&&e.state!=='pre')return null;
 const home=e.state==='pre'?0:score(e.h?.sc),away=e.state==='pre'?0:score(e.a?.sc);
 if(home===null||away===null||!e.id||!e.h?.id||!e.a?.id)return null;
 return {lg:e.lg,id:e.id,hid:e.h.id,aid:e.a.id,hn:e.h.nm,an:e.a.nm,state:e.verifiedFinal?'post':e.verifiedLive?'in':'pre',home,away,half:false,final:e.verifiedFinal===true,period:0,periodEnded:false,kickoff:Number(e.date)};
}
export function basketballNotices(old,e,now){
 const next={...e,at:now,started:!!old?.started||e.state!=='pre',halfSeen:!!old?.halfSeen||e.half,endSeen:!!old?.endSeen||e.final,endedPeriods:[...(old?.endedPeriods||[])],reminderKey:old?.reminderKey||''};
 const notices=[],until=e.kickoff-now,key=String(e.kickoff);
 if(e.state==='pre'&&until>0&&until<=900000&&next.reminderKey!==key){next.reminderKey=key;notices.push({kind:'reminder',key:'reminder-'+key,minutes:Math.ceil(until/60000)})}
 const fresh=old&&now>=old.at&&now-old.at<=900000;
 if(fresh&&old.state==='pre'&&e.state==='in'&&!old.started)notices.push({kind:'start',key:'start'});
 if(fresh&&old.state==='in'&&e.half&&!old.halfSeen)notices.push({kind:'half',key:'half'});
 // Only report an explicit end of period, not a guessed break.
 if(e.periodEnded&&e.period>0&&e.period<=12&&!next.endedPeriods.includes(e.period)){
  next.endedPeriods.push(e.period);
  if(fresh&&old.state==='in'&&!e.half)notices.push({kind:'period',key:'period-'+e.period,period:e.period});
 }
 if(old&&['pre','in'].includes(old.state)&&e.final&&!old.endSeen&&now-old.at<=4*3600000)notices.push({kind:'end',key:'end'});
 return {next,notices};
}
export function basketDelay(events,subs,now){
 let delay=10*60000;
 for(const e of events){if(!subs.some(s=>basketFollows(s,e)))continue;
  if(e.state==='in')return 45000;
  if(e.state==='pre'){const until=e.kickoff-now;if(until<=16*60000&&until>=-30*60000)return 45000;if(until>0)delay=Math.min(delay,Math.max(45000,until-16*60000));}
 }
 return delay;
}
export function basketPayload(e,n){
 const titles={start:'Basketbol maçı başladı',half:'Devre arası',end:'Basketbol maçı bitti',period:(e.lg==='mens-college-basketball'?n.period+'. yarı':n.period<=4?n.period+'. çeyrek':'Uzatma')+' sona erdi',reminder:'Basketbol maçı yaklaşıyor'};
 const body=n.kind==='reminder'?'Başlamasına yaklaşık '+n.minutes+' dakika':e.hn+' '+e.home+' - '+e.away+' '+e.an;
 return {title:titles[n.kind]+' · '+e.hn+' – '+e.an,body,tag:'tribun-basket-'+e.lg+'-'+e.id+'-'+n.key,url:'/#mac-'+BASKET_ROUTES[e.lg]+'-'+e.id};
}
