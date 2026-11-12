import test from 'node:test';
import assert from 'node:assert/strict';
import {selectLeetifyMatches} from '../lib/leetify-matches.mjs';
import {leetifyFor,leetifyRating,metricValue,historyLeetifyCell,renderLeetifySection,statsDetails} from '../public/leetify-stats.mjs';
import {sortHistory} from '../public/history-sort.mjs';
const matchId='1-799a7a2d-6c89-4120-a2f7-5650d7324fec';
const raw={id:'a2f23b83-2090-4af8-965f-bedcb4a3660f',data_source:'faceit',data_source_match_id:matchId,map_name:'de_cache',finished_at:'2026-11-10T18:30:41.000Z',stats:[{steam64_id:'other',leetify_rating:1},{steam64_id:'target',leetify_rating:-.019,reaction_time:.6484,preaim:10.2528,counter_strafing_shots_good_ratio:.8028,trade_kills_succeed:0,unneeded:'exclude'}]};
const row={id:'row1',matchId,map:'cache',finishedAt:1794335441};
test('server returns only FACEIT and the requested player, preserving missing values and zero',()=>{
 const [m]=selectLeetifyMatches([raw,{...raw,data_source:'matchmaking'}],'target');
 assert.equal(m.stats.leetify_rating,-.019);assert.equal(m.stats.trade_kills_succeed,0);assert.equal(m.stats.spray_accuracy,null);assert.equal(m.stats.unneeded,undefined);
 assert.equal(m.metadataKeys,undefined);assert.equal(m.stats.steam64_id,undefined);
 assert.equal(selectLeetifyMatches([raw],'not-present')[0].stats,null);
 assert.throws(()=>selectLeetifyMatches({},'target'));
});
test('history is sorted and capped at 100 after filtering non-FACEIT matches',()=>{
 const input=Array.from({length:105},(_,i)=>({...raw,finished_at:new Date(i*86400000).toISOString()}));
 const output=selectLeetifyMatches([{...raw,data_source:'matchmaking'},...input],'target');
 assert.equal(output.length,100);assert.equal(output[0].finishedAt,input[104].finished_at);
});
test('match join requires exact FACEIT ID and map and rejects ambiguous duplicates',()=>{
 const matches=selectLeetifyMatches([raw],'target');assert.ok(leetifyFor(row,matches));
 assert.equal(leetifyFor({...row,matchId:'different'},matches),null);
 assert.equal(leetifyFor({...row,map:'nuke'},matches),null);
 assert.equal(leetifyFor(row,[...matches,...matches]),null);
 assert.equal(leetifyFor(row,selectLeetifyMatches([raw],'absent')),null);
});
test('API units are rendered in Leetify display units without changing scores',()=>{
 const s=selectLeetifyMatches([raw],'target')[0].stats;
 assert.equal(leetifyRating(-.019),'-1,90');assert.equal(leetifyRating(.0258),'+2,58');assert.equal(leetifyRating(null),'—');
 assert.equal(metricValue(s,'reaction_time'),'648 ms');assert.equal(metricValue(s,'counter_strafing_shots_good_ratio'),'80,3 %');
 assert.equal(metricValue(s,'spray_accuracy'),'—');assert.equal(metricValue(s,'trade_kills_succeed'),'0');
});
test('Leetify rating sorts both ways with missing data last, leaving FACEIT array unchanged',()=>{
 const input=[{id:'a',leetifyRating:null},{id:'b',leetifyRating:-.01},{id:'c',leetifyRating:.05}];
 assert.deepEqual(sortHistory(input,'leetifyRating','desc').map(r=>r.id),['c','b','a']);
 assert.deepEqual(sortHistory(input,'leetifyRating','asc').map(r=>r.id),['b','c','a']);assert.equal(input[0].id,'a');
});
test('UI shows real stats, precise filtered coverage, source links and safe labels',()=>{
 const matches=selectLeetifyMatches([raw],'target');
 assert.match(historyLeetifyCell(row,matches,'ready'),/-1,90/);
 assert.match(statsDetails({...row,map:'<script>'},matches[0]),/&lt;script&gt;/);
 assert.match(statsDetails(row,matches[0]),/View on Leetify/);
 const el=new Map();globalThis.document={getElementById(id){if(!el.has(id))el.set(id,{});return el.get(id);}};
 renderLeetifySection([row,{...row,matchId:'missing'}],matches,'ready');assert.match(el.get('leetifyStatus').textContent,/1 af 2 maps/);
 renderLeetifySection([row],[],'error');assert.match(el.get('leetifyStatus').textContent,/kunne ikke svare/);assert.equal(el.get('leetifyRetryStats').hidden,false);
 renderLeetifySection([row],[],'ready');assert.match(el.get('leetifyStatus').textContent,/0 af 1 maps/);
});
