import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize,sessionPositions,sessionGroups,afterResults,winInterval,mergeDetails,comparison} from '../public/analytics.mjs';
const row=(id,time,kills,deaths,rounds,adr,won,extra={})=>({id,matchId:id,finishedAt:time,map:'nuke',kills,deaths,rounds,adr,won,sourcePlayerStats:{Kills:kills,Deaths:deaths,Assists:2,Headshots:4,...extra}});
test('aggregate ratios and ADR use underlying totals, not mean of ratios',()=>{const s=summarize([row('a',1,10,5,10,100,true,{'Entry Wins':1,'Entry Count':1}),row('b',2,30,30,30,50,false,{'Entry Wins':1,'Entry Count':9})]);assert.equal(s.kd,40/35);assert.equal(s.adr,62.5);assert.equal(s.kpr,1);assert.equal(s.hs,.2);assert.equal(s.entry.value,.2);assert.equal(s.entry.denominator,10);});
test('missing fields are not zeros and zero attempts has no percentage',()=>{const s=summarize([row('a',1,0,2,10,null,true,{'Utility Damage':0,'1v1Wins':0,'1v1Count':0}),row('b',2,5,3,10,60,false)]);assert.equal(s.utility.value,0);assert.equal(s.utility.count,1);assert.equal(s.clutch1.value,null);assert.equal(s.clutch1.count,1);assert.equal(s.entry.value,null);assert.equal(s.entry.count,0);assert.equal(s.adr,60);assert.equal(s.adrCoverage,1);assert.equal(summarize([]).kd,null);});
test('sessions use full history before filters and preserve series position',()=>{const all=[row('a',100,1,1,20,50,true),row('b',2000,1,1,20,50,false),row('c',8000,1,1,20,50,true)];const duplicate={...all[1],id:'b:2'};assert.equal(sessionPositions([...all,duplicate]).get('b:2'),2);assert.equal(sessionGroups([all[1]],all)[1].count,1);assert.equal(afterResults([all[1]],all)[0].count,1);assert.equal(afterResults([all[2]],all)[1].count,0);});
test('Wilson interval expresses small sample uncertainty',()=>{const interval=winInterval(1,1);assert.ok(interval[0]>.2&&interval[0]<.21);assert.ok(interval[1]>.999);assert.equal(winInterval(0,0),null);assert.equal(comparison(Array(19).fill({})),null);});
test('detail merge selects requested player and map',()=>{const base=row('a',1,3,3,10,50,true);const payload={rounds:[{round_stats:{Map:'de_nuke'},teams:[{players:[{player_id:'other',player_stats:{'Entry Wins':999}},{player_id:'target',player_stats:{'Entry Wins':'2'}}]}]}]};assert.equal(mergeDetails(base,payload,'target').sourcePlayerStats['Entry Wins'],'2');assert.equal(mergeDetails(base,payload,'missing'),base);});

test('rebound pairs use immediate next game from full history, not next filtered map',async()=>{
 const {reboundPairs,reboundSummary}=await import('../public/analytics.mjs');
 const a=row('a',100,10,14,20,60,false),b={...row('b',1000,12,16,30,50,true),map:'dust2'},c=row('c',2000,20,10,20,100,true);
 const pairs=reboundPairs([a,c],[a,b,c],{rule:'kprBelow',threshold:.6});
 assert.equal(pairs.length,1);assert.equal(pairs[0].next.id,'b');
 const s=reboundSummary(pairs);assert.equal(s.kills.increased,1);assert.equal(s.kpr.decreased,1);assert.equal(s.kpr.improvementRate,0);assert.ok(Math.abs(s.kpr.delta+.1)<1e-8);
});
test('rebound thresholds distinguish strict KPR, exact kills, maximum kills and prior loss',async()=>{
 const {reboundPairs}=await import('../public/analytics.mjs');
 const all=[row('a',100,10,12,20,60,false),row('b',1000,12,13,20,70,false),row('c',2000,10,14,20,60,true),row('d',3000,15,10,20,80,true)];
 assert.equal(reboundPairs(all,all,{rule:'kprBelow',threshold:.6}).length,2);
 assert.equal(reboundPairs(all,all,{rule:'killsExactly',threshold:10,result:'loss'}).length,1);
 assert.equal(reboundPairs(all,all,{rule:'killsAtMost',threshold:12,result:'loss'}).length,2);
});
test('rebound does not skip series, and session gap is optional',async()=>{
 const {reboundPairs}=await import('../public/analytics.mjs');
 const a=row('a',100,5,10,20,40,false),b=row('b',7000,10,12,20,60,true);
 assert.equal(reboundPairs([a],[a,b]).length,1);
 assert.equal(reboundPairs([a],[a,b],{sameSession:true}).length,0);
 const series=[row('series',2000,1,1,20,30,true),{...row('series',2000,1,1,20,30,true),id:'series:2'}];
 assert.equal(reboundPairs([a],[a,...series,b]).length,0);
});
test('rebound comparison excludes missing values and treats equal KPR as unchanged',async()=>{
 const {reboundSummary}=await import('../public/analytics.mjs');
 const s=reboundSummary([{previous:row('a',100,10,10,20,null,false),next:row('b',200,15,12,30,70,true)},{previous:row('c',300,5,10,0,50,false),next:row('d',400,null,10,20,80,false)}]);
 assert.equal(s.kpr.count,1);assert.equal(s.kpr.equal,1);assert.equal(s.kpr.increased,0);assert.equal(s.kills.count,1);assert.equal(s.adr.count,1);assert.equal(s.adr.delta,30);
 assert.equal(reboundSummary([]).kpr.improvementRate,null);
});
