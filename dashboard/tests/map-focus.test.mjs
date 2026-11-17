import test from 'node:test';
import assert from 'node:assert/strict';
import {mapSideRatings,mapComment} from '../public/map-focus.mjs';

test('both side summaries use the same paired games and include legitimate zero',()=>{
  const entries=[{stats:{ct_leetify_rating:0,t_leetify_rating:-1}},
    {stats:{ct_leetify_rating:2,t_leetify_rating:1}},{stats:{ct_leetify_rating:9,t_leetify_rating:null}}];
  assert.deepEqual(mapSideRatings(entries),{count:2,t:{average:0,median:0,positive:1},ct:{average:1,median:1,positive:1}});
});

test('utility comment requires sufficient coverage and labels the personal baseline',()=>{
  const entries=(n,x)=>Array.from({length:n},()=>({row:{},stats:{utility_on_death_avg:x}}));
  assert.equal(mapComment(entries(4,600),entries(10,400)),null);
  assert.equal(mapComment(entries(5,450),entries(10,400)),null);
  assert.match(mapComment(entries(5,600),entries(10,400)).evidence,/600.*400.*5 kampe.*10/);
});
