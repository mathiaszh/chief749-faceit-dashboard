import test from 'node:test';
import assert from 'node:assert/strict';
import {leetifyRules, passesLeetifyThreshold, followupLeetifyStats} from '../public/combined-stats.mjs';
import {reboundPairs} from '../public/analytics.mjs';

test('Leetify filters compare the displayed scale and skip missing metrics', () => {
  assert.equal(passesLeetifyThreshold(-0.06,leetifyRules.ct_leetify_rating,-5,'below'), true);
  assert.equal(passesLeetifyThreshold(-0.05,leetifyRules.ct_leetify_rating,-5,'below'), false);
  assert.equal(passesLeetifyThreshold(0.551,leetifyRules.reaction_time,550,'above'), true);
  assert.equal(passesLeetifyThreshold(0.75,leetifyRules.counter_strafing_shots_good_ratio,75,'above'), false);
  assert.equal(passesLeetifyThreshold(null,leetifyRules.utility_on_death_avg,500,'below'), false);
});

test('a missing Leetify value in the immediate successor leaves the pair out of that average', () => {
  const rows = ['a','b','c'].map((id,i)=>({id,matchId:id,map:'nuke',finishedAt:i+1}));
  const matches = [{sourceId:'a',map:'nuke',stats:{reaction_time:0.6}},{sourceId:'c',map:'nuke',stats:{reaction_time:0.4}}];
  const pairs = reboundPairs([rows[0]],rows,{rule:'all'});
  assert.equal(pairs[0].next.id,'b');
  assert.equal(followupLeetifyStats(pairs,matches).find(m=>m.label==='Time to Damage').count,0);
});
