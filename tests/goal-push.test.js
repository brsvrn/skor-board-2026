import {test} from 'node:test';import assert from 'node:assert/strict';
import {isGoal,subscriptionOK,ids,follows,mapEvent,shouldScan,nextPoll,noticePrefs,matchNotices,noticePayload,teamPrefs,wants,hasNotices,readSummary,extraNotices} from '../lib/goal-push.js';
const e={id:'12',home:1,away:0,state:'in',hid:'4',aid:'5'};
test('first observation is not a goal',()=>assert.equal(isGoal(null,e,100),false));
test('goal, repeat, correction and stale baseline',()=>{
 const old={home:0,away:0,state:'in',at:100};
 assert.equal(isGoal(old,e,200),true);assert.equal(isGoal({...e,at:100},e,200),false);
 assert.equal(isGoal({...old,home:2},e,200),false);assert.equal(isGoal(old,e,1000000),false);
});
test('favorites only',()=>{assert.ok(follows({fm:[],ft:['4']},e));assert.equal(follows({fm:[],ft:['6']},e),false);assert.deepEqual(ids(['2','2','x',2]),['2'])});
test('reject SSRF destinations',()=>{assert.equal(subscriptionOK({endpoint:'https://127.0.0.1/',keys:{}}),false);assert.equal(subscriptionOK({endpoint:'https://fcm.googleapis.com.evil.example/',keys:{}}),false)});
test('invalid upstream event',()=>assert.equal(mapEvent({id:'12'},'tur.1'),null));

test('adaptive polling and newly changed favorites',()=>{
 const now=1000000,sub={fm:['12'],ft:[]};
 assert.equal(nextPoll([{...e,state:'pre',kickoff:now+3600000}],[sub],now),now+600000);
 assert.equal(nextPoll([e],[sub],now),now+45000);
 assert.equal(shouldScan({__scanAt:now,__nextPoll:now+600000},now+1000),false);
 assert.equal(shouldScan({__scanAt:now,__nextPoll:now+600000},now+1000,now+500),true);
});
test('pre-match missing score is zero baseline',()=>{
 const x=mapEvent({id:'12',date:'2026-11-25T19:00:00Z',status:{type:{state:'pre'}},competitions:[{competitors:[{homeAway:'home',team:{id:'4'}},{homeAway:'away',team:{id:'5'}}]}]},'tur.1');
 assert.equal(x.home,0);assert.equal(x.away,0);assert.ok(Number.isFinite(x.kickoff));
});

test('legacy subscribers receive goals only and false is preserved',()=>{
 assert.deepEqual(noticePrefs(),{goal:true,start:false,half:false,end:false,red:false,reminder:false,lineup:false,var:false,cancel:false});
 assert.deepEqual(noticePrefs({goal:false,red:true,unknown:true}),{goal:false,start:false,half:false,end:false,red:true,reminder:false,lineup:false,var:false,cancel:false});
});
test('start, goal, halftime, full time and no repeated phase',()=>{
 const now=1000000,b={...e,lg:'tur.1',hn:'A',an:'B',home:0,away:0,reds:[],half:false,final:false};
 let x=matchNotices(null,{...b,state:'pre'},now);
 assert.deepEqual(x.notices,[]);
 x=matchNotices(x.next,b,now+60000);assert.deepEqual(x.notices.map(n=>n.kind),['start']);
 x=matchNotices(x.next,{...b,home:1},now+120000);assert.deepEqual(x.notices.map(n=>n.kind),['goal']);
 x=matchNotices(x.next,{...b,home:1,half:true},now+180000);assert.deepEqual(x.notices.map(n=>n.kind),['half']);
 x=matchNotices(x.next,{...b,home:1,half:true},now+240000);assert.equal(x.notices.length,0);
 x=matchNotices(x.next,{...b,home:1,half:false},now+300000);
 x=matchNotices(x.next,{...b,home:1,state:'post',final:true},now+360000);assert.deepEqual(x.notices.map(n=>n.kind),['end']);
 x=matchNotices(x.next,{...b,home:1,state:'post',final:true},now+420000);assert.equal(x.notices.length,0);
});
test('red card is new, deduplicated across missing details, no historic replay',()=>{
 const now=1000000,b={...e,lg:'tur.1',hn:'A',an:'B',reds:[],half:false,final:false},card={key:'4:8',team:'4',name:'Player',minute:"30'"};
 let x=matchNotices(null,b,now);
 x=matchNotices(x.next,{...b,reds:[card]},now+60000);assert.deepEqual(x.notices.map(n=>n.kind),['red']);assert.match(noticePayload(b,x.notices[0]).body,/Player/);
 x=matchNotices(x.next,{...b,reds:null},now+120000);
 x=matchNotices(x.next,{...b,reds:[card]},now+180000);assert.equal(x.notices.length,0);
 assert.equal(matchNotices(null,{...b,reds:[card]},now).notices.length,0);
 assert.equal(matchNotices({home:1,away:0,state:'in',at:now-60000},{...b,reds:[card]},now).notices.length,0);
});
test('postponement and stale transition do not notify',()=>{
 const now=1000000,old={home:0,away:0,state:'in',at:now-60000};
 assert.equal(matchNotices(old,{...e,state:'post',final:false,reds:[]},now).notices.length,0);
 assert.equal(matchNotices({...old,at:now-1000000},{...e,state:'post',final:true},now).notices.length,0);
});
test('map real-shaped card and status',()=>{
 const raw={id:'12',status:{type:{state:'in',name:'STATUS_HALFTIME',shortDetail:'HT'}},competitions:[{competitors:[{homeAway:'home',score:'0',team:{id:'4'}},{homeAway:'away',score:'0',team:{id:'5'}}],details:[{redCard:true,type:{id:'93',text:'Red Card'},team:{id:'4'},clock:{displayValue:"8'"},athletesInvolved:[{id:'8',displayName:'Player'}]}]}]};
 const x=mapEvent(raw,'tur.1');assert.equal(x.half,true);assert.equal(x.reds[0].key,'4:8');
 raw.status.type={state:'post',name:'STATUS_FULL_TIME',completed:true};assert.equal(mapEvent(raw,'tur.1').final,true);
 raw.status.type={state:'post',name:'STATUS_POSTPONED',completed:true};assert.equal(mapEvent(raw,'tur.1').final,false);
});

test('team overrides and direct match precedence',()=>{const s={fm:[],ft:['4'],prefs:{goal:true},teamPrefs:teamPrefs({'4':{goal:false,red:true},'5':{goal:true}},['4'])};assert.equal(wants(s,e,'goal'),false);assert.equal(wants(s,e,'red'),true);assert.equal(wants({...s,fm:['12']},e,'goal'),true);assert.equal(hasNotices(s),true)});
test('reminder window and deduplication',()=>{const now=1000000,b={...e,state:'pre',kickoff:now+900000};let x=extraNotices(null,b,now,null);assert.equal(x.notices[0].kind,'reminder');assert.equal(extraNotices(x.next,b,now+60000,null).notices.length,0);assert.equal(extraNotices(null,{...b,kickoff:now+900001},now,null).notices.length,0)});
test('lineups require eleven unique starters for both teams',()=>{const rs=['4','5'].map(id=>({team:{id},roster:Array.from({length:11},(_,i)=>({starter:true,athlete:{id:String(i+1)}}))}));const b={...e,state:'pre',kickoff:99999999};const data=readSummary({rosters:rs,keyEvents:[]},b);assert.equal(data.lineup,true);const x=extraNotices(null,b,1000000,data);assert.equal(x.notices[0].kind,'lineup');assert.equal(extraNotices(x.next,b,1000100,data).notices.length,0);rs[1].roster.pop();assert.equal(readSummary({rosters:rs},b).lineup,false)});
test('explicit VAR and score correction, never claim inferred VAR',()=>{const now=1000000,b={...e,lg:'tur.1',hn:'A',an:'B',final:false};const review=readSummary({keyEvents:[{id:'1',type:{text:'VAR Review'},clock:{displayValue:"20'"}},{id:'2',type:{text:'Yellow Card'}}]},b);assert.equal(review.reviews.length,1);const old={state:'in',at:now-60000,home:2,away:0,reviewKnown:true,reviewSeen:[]};const x=extraNotices(old,b,now,review);assert.deepEqual(x.notices.map(n=>n.kind),['var','cancel']);assert.equal(x.notices[1].confirmed,false);assert.match(noticePayload(b,x.notices[1]).body,/düzeltmesi/);assert.equal(extraNotices({...old,reviewKnown:false}, {...b,home:2},now,review).notices.length,0)});
