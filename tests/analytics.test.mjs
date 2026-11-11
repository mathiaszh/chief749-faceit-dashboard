import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize, forecast} from '../web/analytics.mjs';

test('K/D uses totals, ADR is weighted and missing values stay missing', () => {
  const result = summarize([
    {won:true,kills:20,deaths:10,adr:100,rounds:10},
    {won:false,kills:5,deaths:20,adr:50,rounds:30},
    {won:true,kills:null,deaths:null,adr:null,rounds:20},
  ]);
  assert.equal(result.kd,25/30);
  assert.equal(result.adr,62.5);
  assert.equal(result.winrate,2/3);
  assert.equal(summarize([]).kd,null);
});

test('forecast avoids optimistic dates with insufficient or losing data', () => {
  const now = Date.now();
  const rows = Array.from({length:20},(_,i)=>({matchId:String(i),finishedAt:now/1000-100,won:i<12}));
  assert.equal(forecast(rows.slice(0,3),1911,now).insufficient,true);
  assert.equal(forecast(rows,1911,now).games,18);
  assert.equal(forecast(rows.map(row=>({...row,won:false})),1911,now).games,null);
  assert.equal(forecast(rows,2001,now).reached,true);
});
