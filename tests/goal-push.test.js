import {test} from 'node:test';import assert from 'node:assert/strict';
import {isGoal,subscriptionOK,ids,follows,mapEvent} from '../lib/goal-push.js';
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
