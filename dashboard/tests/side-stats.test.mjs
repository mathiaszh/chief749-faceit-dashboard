import test from 'node:test';
import assert from 'node:assert/strict';
import {halfScoreNote, reboundSideStats, summarizeHalves} from '../public/side-stats.mjs';

test('halves use team rounds from bulk FACEIT stats and keep overtime separate', () => {
  const row = {sourcePlayerStats: {'First Half Score':'3', 'Second Half Score':'9', 'Overtime score':'4'}};
  assert.deepEqual(summarizeHalves([row, {}]), {first:3, second:9, count:1, overtime:4, overtimeCount:1});
  assert.match(halfScoreNote(row), /1H: 3 · 2H: 9 · OT: 4/);
});

test('follow-up comparisons preserve zero and require both games for each metric', () => {
  const row = (matchId, first) => ({matchId, map:'cache', sourcePlayerStats:{'First Half Score':first}});
  const pairs = [
    {previous:row('a','0'), next:row('b','6')},
    {previous:row('b','6'), next:row('c',null)},
  ];
  const matches = [
    {sourceId:'a', map:'de_cache', stats:{ct_leetify_rating:0, t_leetify_rating:null}},
    {sourceId:'b', map:'de_cache', stats:{ct_leetify_rating:0.04, t_leetify_rating:0.01}},
  ];
  const [first, second, ct, t] = reboundSideStats(pairs, matches);
  assert.deepEqual([first.count, first.previous, first.next], [1,0,6]);
  assert.deepEqual([ct.count, ct.previous, ct.next, ct.delta], [1,0,0.04,0.04]);
  assert.equal(second.count,0);
  assert.equal(t.next,null);
});
