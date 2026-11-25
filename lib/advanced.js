import {cached,valid,foreignFixture} from './ds-data.js';
const arr=x=>Array.isArray(x)?x:[];
const text=x=>typeof x==='string'?x.slice(0,150):'';
const between=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
const position=p=>between(p?.x,0,100)&&between(p?.y,0,100)?{x:p.x,y:p.y}:null;
export function normalizeAdvanced(kind,data){
 if(kind==='shots')return {items:arr(data).filter(s=>['home','away'].includes(s.side)).slice(0,500).map(s=>({side:s.side,position:position(s.position),xg:between(s.expectedGoals,0,1)?s.expectedGoals:null,outcome:text(s.outcome),minute:between(s.minute,0,150)?s.minute:null,player:text(s.player?.name)}))};
 if(kind==='momentum')return {items:arr(data?.points).filter(p=>between(p.minute,0,150)&&between(p.value,-1000,1000)).slice(0,200).map(p=>({minute:p.minute,added:between(p.addedMinute,0,30)?p.addedMinute:null,value:p.value}))};
 if(kind==='ratings')return {items:['home','away'].flatMap(side=>arr(data?.[side]?.players).filter(p=>valid(p.player?.id)&&text(p.player?.name)).map(p=>({side,id:String(p.player.id),name:text(p.player.name),rating:between(p.rating,0,10)?p.rating:null}))).slice(0,100)};
 if(kind==='heatmap')return {items:arr(data?.points).map(position).filter(Boolean).slice(0,3000)};
 throw Error('bad_request');
}
export async function advanced(lg,id,kind,player){
 if(!['shots','momentum','ratings','heatmap'].includes(kind))throw Error('bad_request');
 const raw=/^ds[1-9]\d{0,11}$/.test(id)&&lg.startsWith('ds-')?id.slice(2):(await foreignFixture(lg,id))?.hit?.id;
 if(!valid(raw))throw Error('no_data');
 if(kind==='heatmap'&&!valid(player))throw Error('bad_request');
 const suffix={shots:'shotmap',momentum:'momentum',ratings:'lineups',heatmap:'heatmap/'+player}[kind];
 const data=await cached('fixtures/'+raw+'/'+suffix,kind==='ratings'?900:1800);
 return {...normalizeAdvanced(kind,data),source:'DataSportsAPI'};
}
