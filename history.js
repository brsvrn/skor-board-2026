// Local device-only received notification history, shared by page and service worker.
(()=>{
 const root=globalThis;
 function open(){return new Promise((resolve,reject)=>{const r=indexedDB.open('tribun-notice-history',1);r.onupgradeneeded=()=>{const s=r.result.createObjectStore('items',{keyPath:'id'});s.createIndex('at','at')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
 async function run(mode,work){const db=await open();return new Promise((resolve,reject)=>{const t=db.transaction('items',mode);let result;const s=t.objectStore('items');t.oncomplete=()=>{db.close();resolve(result)};t.onerror=t.onabort=()=>{db.close();reject(t.error||Error('history'))};work(s,v=>{result=v})})}
 function safeURL(v){try{const u=new URL(v||'/#favori',root.location.origin);return u.origin===root.location.origin&&u.pathname==='/'?u.pathname+u.hash:'/#favori'}catch{return '/#favori'}}
 async function add(p){const at=Date.now(),id=String(p.tag||'notice')+'-'+at+'-'+Math.random().toString(36).slice(2,8);return run('readwrite',s=>{s.put({id,at,title:String(p.title||'Tribün').slice(0,180),body:String(p.body||'').slice(0,400),url:safeURL(p.url)});let n=0;const r=s.index('at').openCursor(null,'prev');r.onsuccess=()=>{const c=r.result;if(c){if(++n>100)c.delete();c.continue()}}})}
 async function list(){return run('readonly',(s,done)=>{const out=[],r=s.index('at').openCursor(null,'prev');r.onsuccess=()=>{const c=r.result;if(c&&out.length<100){out.push(c.value);c.continue()}else done(out)}})}
 async function clear(){return run('readwrite',s=>s.clear())}
 root.TribunHistory={add,list,clear};
})();
