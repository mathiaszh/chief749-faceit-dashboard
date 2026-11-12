import test from 'node:test';
import assert from 'node:assert/strict';
import {coverageCounts,createCoverage} from '../public/leetify-coverage.mjs';
const rows=Array.from({length:100},(_,i)=>({matchId:String(i),map:'Mirage'}));
function setup(request){
 const elements=new Map();
 globalThis.document={getElementById(id){if(!elements.has(id))elements.set(id,{addEventListener(event,fn){this[event]=fn;}});return elements.get(id);}};
 let time=0;const starts=[];
 const coverage=createCoverage({now:()=>time,wait:async ms=>{time+=ms;},requestFetch:async (url,options)=>{starts.push({time,url});return request(url,options);}});
 coverage.reset('Chief749');coverage.render(rows);
 return {elements,coverage,starts,advance(ms){time+=ms;},click:()=>elements.get('leetifyCheck').click()};
}
const ok=()=>({ok:true,status:200,json:async()=>({providerStatus:200,playerFound:true,availableFields:['kills']})});
test('rate-limited and access-denied requests are not completed coverage checks',()=>{
 const results=new Map(rows.map((row,i)=>[row.matchId,{state:i<3?'available':i<20?'error':'limited'}]));
 assert.deepEqual(coverageCounts(rows,results),{available:3,missing:0,error:17,access:0,limited:80,pending:0,unchecked:0,checked:20});
 results.set('0',{state:'access'});assert.equal(coverageCounts(rows,results).checked,19);
});
test('429 stops the batch, locks buttons, and retries the blocked match after cooldown',async()=>{
 let count=0;const s=setup(async()=>++count===3?{ok:false,status:429,headers:{get:()=> '90'},json:async()=>({})}:ok());
 await s.click();assert.equal(count,3);
 assert.match(s.elements.get('leetifyCoverageSummary').textContent,/2 opslag gennemført · 98 ikke undersøgt/);
 assert.match(s.elements.get('leetifyCoverageErrors').textContent,/90 sekunder/);
 assert.equal(s.elements.get('leetifyCheck').disabled,true);
 await s.click();assert.equal(count,3);
 s.advance(61000);await s.click();assert.equal(count,3);
 s.advance(30000);await s.click();assert.equal(count,13);
 assert.equal(new URL(s.starts[3].url,'https://example.com').searchParams.get('matchId'),'2');
 assert.match(s.elements.get('leetifyCoverageSummary').textContent,/12 opslag gennemført · 88 ikke undersøgt/);
 assert.equal(s.elements.get('leetifyCheck').disabled,false);
 for(let i=1;i<s.starts.length;i++)assert.ok(s.starts[i].time-s.starts[i-1].time>=3200);
});
test('provider-level 429 also pauses, and pacing continues across batches',async()=>{
 let limited=true;const s=setup(async()=>limited?{ok:true,status:200,json:async()=>({providerStatus:429})}:ok());
 await s.click();assert.equal(s.starts.length,1);assert.match(s.elements.get('leetifyCoverageSummary').textContent,/0 opslag gennemført · 100 ikke undersøgt/);
 limited=false;s.advance(60000);await s.click();await s.click();assert.equal(s.starts.length,21);
 for(let i=1;i<s.starts.length;i++)assert.ok(s.starts[i].time-s.starts[i-1].time>=3200);
});
test('changing player discards in-flight results',async()=>{
 let resolve;const s=setup(()=>new Promise(r=>{resolve=r;}));
 const running=s.click();s.coverage.reset('AnotherPlayer');s.coverage.render(rows);resolve(ok());await running;
 assert.match(s.elements.get('leetifyCoverageSummary').textContent,/0 af 100/);
 assert.match(s.elements.get('leetifyCoverageSummary').textContent,/100 ikke undersøgt/);
 assert.equal(s.starts.length,1);
});
