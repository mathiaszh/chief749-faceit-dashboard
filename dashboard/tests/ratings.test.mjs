import test from 'node:test';
import assert from 'node:assert/strict';
import {haldRating,rateHistory,ratingInputs} from '../public/ratings.mjs';
const reference={version:'test',metrics:{adr:{mean:80,sd:20},kpr:{mean:1,sd:.2},dpr:{mean:.5,sd:.2},od:{mean:0,sd:.1},fpr:{mean:.5,sd:.2}}};
const row=(id,time,extra={})=>({id:String(id),matchId:String(id),finishedAt:time,map:'nuke',rounds:20,kills:20,deaths:10,adr:80,sourcePlayerStats:{'Entry Count':4,'Entry Wins':2,'Enemies Flashed':10},...extra});
test('reference average rates 1; signed standard deviations follow proposed weights',()=>{
 assert.equal(haldRating(row(1,1),reference).score,1);
 assert.ok(Math.abs(haldRating(row(1,1,{adr:100,kills:24,deaths:14,sourcePlayerStats:{'Entry Count':4,'Entry Wins':3,'Enemies Flashed':14}}),reference).score-1.14)<1e-10);
 assert.equal(ratingInputs(row(1,1)).od,0);
});
test('missing components and invalid reference never become a zero score',()=>{
 assert.equal(haldRating(row(1,1,{sourcePlayerStats:{}}),reference).score,null);
 assert.equal(haldRating(row(1,1,{adr:null}),reference).score,null);
 assert.equal(haldRating(row(1,1,{rounds:0}),reference).score,null);
 assert.equal(haldRating(row(1,1),{metrics:{}}).score,null);
 const zero=row(1,1,{sourcePlayerStats:{'Entry Count':0,'Entry Wins':0,'Enemies Flashed':0}});
 assert.notEqual(haldRating(zero,reference).score,null);
});
test('score is clipped and parts explain the unclipped result',()=>{
 const r=haldRating(row(1,1,{adr:1000}),reference);assert.equal(r.score,2);assert.equal(r.raw,1+r.parts.reduce((s,p)=>s+p.contribution,0));
});
test('personal rating requires 20 prior complete maps, counts ties half and cannot see the future',()=>{
 const rows=Array.from({length:21},(_,i)=>row(i,i+1));
 const results=rateHistory(rows,reference);assert.equal(results.get('19').personal,null);assert.equal(results.get('20').personal,50);assert.equal(results.get('20').historyScope,'map');
 const future=row('future',99,{adr:150});assert.equal(rateHistory([...rows,future],reference).get('20').personal,50);
 const sameMatch=row('other-map',20,{matchId:'20',map:'dust2'});assert.equal(rateHistory([...rows,sameMatch],reference).get('20').historyCount,20);
});
test('fallback uses all maps, ignores duplicate/missing data and excludes equal timestamps',()=>{
 const rows=Array.from({length:20},(_,i)=>row(i,i+1,{map:i%2?'nuke':'dust2'}));const current=row('current',30,{adr:100});
 const r=rateHistory([...rows,rows[0],current,row('equal',30),row('missing',25,{adr:null})],reference).get('current');
 assert.equal(r.personal,100);assert.equal(r.historyCount,20);assert.equal(r.historyScope,'all');
});
