import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeAdvanced} from '../lib/advanced.js';
import {scorePoints,scoreOK} from '../api/community.js';
test('advanced values never fabricate missing xG or coordinates',()=>{const r=normalizeAdvanced('shots',[{side:'home',position:{x:110,y:10},expectedGoals:null},{side:'away',position:{x:25,y:60},expectedGoals:0.25}]);assert.equal(r.items[0].position,null);assert.equal(r.items[0].xg,null);assert.equal(r.items[1].xg,.25);assert.deepEqual(r.items[1].position,{x:25,y:60})});
test('momentum requires actual minute and finite values',()=>{assert.deepEqual(normalizeAdvanced('momentum',{points:[{minute:2,value:12},{minute:null,value:99},{minute:3,value:'8'}]}).items,[{minute:2,added:null,value:12}])});
test('community scoring uses verified exact score or outcome',()=>{assert.equal(scorePoints(2,1,2,1),3);assert.equal(scorePoints(2,1,1,0),1);assert.equal(scorePoints(2,1,1,1),0);assert.equal(scoreOK(null),false);assert.equal(scoreOK(2.1),false);assert.equal(scoreOK(2),true)});
