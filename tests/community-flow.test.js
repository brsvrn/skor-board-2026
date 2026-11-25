import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/community.js';
test('community flow validates group ownership, vote, scoring and deletion',async t=>{
 const oldFetch=global.fetch,oldUrl=process.env.KV_REST_API_URL;process.env.KV_REST_API_URL='https://mock-redis.invalid';const values=new Map(),sets=new Map(),hashes=new Map();
 const map=(m,k)=>{if(!m.has(k))m.set(k,new Map());return m.get(k)};
 const set=(k)=>{if(!sets.has(k))sets.set(k,new Set());return sets.get(k)};
 let final=false;const date=new Date(Date.now()+3600000).toISOString();
 global.fetch=async (url,opts)=>{
  if(String(url).startsWith('https://site.api.espn.com/'))return {ok:true,json:async()=>({header:{competitions:[{id:'123',date,status:{type:{state:final?'post':'pre',completed:final,name:final?'STATUS_FINAL':'STATUS_SCHEDULED'}},competitors:[{homeAway:'home',score:final?'2':'0',team:{displayName:'A'}},{homeAway:'away',score:final?'1':'0',team:{displayName:'B'}}]}]}})};
  assert.equal(url,'https://mock-redis.invalid');const [cmd,k,...args]=JSON.parse(opts.body);let result;
  if(cmd==='SET'){if(args.includes('NX')&&values.has(k))result=null;else{values.set(k,args[0]);result='OK'}}
  else if(cmd==='GET')result=values.get(k)??null;
  else if(cmd==='INCR'){result=Number(values.get(k)||0)+1;values.set(k,result)}
  else if(cmd==='EXPIRE')result=1;
  else if(cmd==='DEL'){for(const key of [k,...args]){values.delete(key);hashes.delete(key);sets.delete(key)}result=1}
  else if(cmd==='SADD'){set(k).add(args[0]);result=1}
  else if(cmd==='SCARD')result=set(k).size;
  else if(cmd==='SISMEMBER')result=Number(set(k).has(args[0]));
  else if(cmd==='SMEMBERS')result=[...set(k)];
  else if(cmd==='HSET'){map(hashes,k).set(args[0],args[1]);result=1}
  else if(cmd==='HDEL'){result=Number(map(hashes,k).delete(args[0]))}
  else if(cmd==='HEXISTS')result=Number(map(hashes,k).has(args[0]));
  else if(cmd==='HGETALL')result=[...map(hashes,k)].flat();
  else if(cmd==='EVAL'){const [count,key,member,value]=args;assert.equal(count,1);map(hashes,key).set(member,value);result=1}
  else throw Error('unknown mock command '+cmd);
  return {ok:true,json:async()=>({result})}
 };
 t.after(()=>{global.fetch=oldFetch;if(oldUrl===undefined)delete process.env.KV_REST_API_URL;else process.env.KV_REST_API_URL=oldUrl});
 const A='a'.repeat(64),B='b'.repeat(64),C='c'.repeat(64),call=async(token,action,data={})=>{let status=200,body;await handler({method:'POST',headers:{origin:'https://test.invalid',host:'test.invalid'},body:{token,action,...data}},{setHeader(){},status(n){status=n;return this},json(x){body=x;return this}});return {status,body}};
 const challenge=await call(A,'create',{name:'A',groupName:'Challenge',match:{lg:'eng.1',id:'123',h:2,a:1}});assert.equal(challenge.status,200);const invited=await call(B,'join',{code:challenge.body.code,name:'B'});assert.equal(invited.status,200);const cb=await call(A,'board',{code:challenge.body.code});assert.equal(cb.body.matches[0].mine.h,2);assert.equal(cb.body.board.length,2);
 const g=await call(A,'create',{name:'A',groupName:'Friends'});assert.equal(g.status,200);const code=g.body.code,match={lg:'eng.1',id:'123'};
 assert.equal((await call(B,'join',{code,name:'B'})).status,200);
 assert.equal((await call(C,'board',{code})).status,403);
 assert.equal((await call(B,'add',{code,...match})).status,403);
 assert.equal((await call(A,'add',{code,...match})).status,200);
 assert.equal((await call(B,'predict',{code,...match,h:2,a:1})).status,200);
 assert.equal((await call(B,'poll',{...match,choice:'home'})).body.counts.home,1);
 assert.equal((await call(B,'poll',{...match,choice:'away'})).body.counts.home,0);
 final=true;assert.equal((await call(B,'predict',{code,...match,h:3,a:1})).status,409);
 const board=await call(A,'board',{code});assert.equal(board.body.board.find(x=>x.name==='B').points,3);
 assert.equal((await call(B,'delete')).status,200);
 assert.equal((await call(B,'board',{code})).status,403);
 assert.equal((await call(A,'poll',match)).body.counts.away,0);
});
