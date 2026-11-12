export function classifyLeetify(result){
 if(result.providerStatus===200)return result.playerFound&&result.availableFields?.length?'available':'missing';
 if(result.providerStatus===404)return 'missing';
 if(result.providerStatus===401||result.providerStatus===403)return 'access';
 if(result.providerStatus===429)return 'limited';
 return 'error';
}
export function coverageCounts(rows,results){
 const counts={available:0,missing:0,error:0,access:0,limited:0,pending:0,unchecked:0};
 for(const row of rows)counts[results.get(row.matchId)?.state||'unchecked']++;
 counts.checked=rows.length-counts.unchecked-counts.pending;
 return counts;
}
const labels={available:'Data fundet',missing:'Ingen data returneret',error:'Opslag fejlede – prøv igen',access:'Adgang afvist',limited:'Grænse nået – prøv senere',pending:'Undersøger…',unchecked:'Ikke undersøgt'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCoverage(){
 const $=id=>document.getElementById(id);
 let results=new Map(),rows=[],nickname='',busy=false,abort=new AbortController(),version=0;
 function render(){
  const n=coverageCounts(rows,results);
  $('leetifyCoverageSummary').textContent=`${n.available} af ${n.checked} undersøgte maps har Leetify-data · ${n.unchecked} ikke undersøgt · ${n.pending} hentes`;
  $('leetifyCoverageErrors').textContent=`${n.missing} uden returnerede spillerdata · ${n.error} fejl · ${n.access} med afvist adgang · ${n.limited} ramt af forespørgselsgrænse. En fejl beviser ikke, at kampen mangler hos Leetify.`;
  $('leetifyCheck').disabled=busy||!n.unchecked;
  $('leetifyRetry').disabled=busy||!(n.error+n.missing+n.access+n.limited);
  $('leetifyCheck').textContent=busy?'Undersøger…':'Undersøg næste 10 maps';
  $('leetifyCoverageRows').innerHTML=rows.map(row=>{const item=results.get(row.matchId)||{state:'unchecked'};return `<tr><td>${row.finishedAt?new Date(row.finishedAt*1000).toLocaleDateString('da-DK'):'—'}</td><td>${esc(row.map)}</td><td class="coverage-${item.state}">${labels[item.state]}</td><td>${item.state==='available'?`${item.fields.length} numeriske statistikfelter tilgængelige`:'—'}</td></tr>`;}).join('');
 }
 async function run(retry=false){
  if(busy||!nickname)return;
  const selected=[...new Set(rows.filter(r=>{const state=results.get(r.matchId)?.state;return retry?state&&['error','missing','access','limited'].includes(state):!state;}).map(r=>r.matchId))].slice(0,10);
  if(!selected.length)return;busy=true;const token=version,name=nickname,signal=abort.signal,queue=[...selected];
  selected.forEach(id=>results.set(id,{state:'pending'}));render();
  async function worker(){while(queue.length&&token===version){const id=queue.shift();try{
   const response=await fetch('/api/leetify-check?nickname='+encodeURIComponent(name)+'&matchId='+encodeURIComponent(id),{signal,cache:'no-store'});
   const data=await response.json();if(token!==version)return;
   const state=response.ok?classifyLeetify(data):response.status===429?'limited':response.status===503?'access':'error';
   results.set(id,{state,fields:Array.isArray(data.availableFields)?data.availableFields:[]});
   if(['limited','access'].includes(state)){queue.splice(0).forEach(pending=>results.delete(pending));}
  }catch(error){if(token!==version||error.name==='AbortError')return;results.set(id,{state:'error'});}render();}}
  await Promise.all([worker(),worker()]);if(token===version){busy=false;render();}
 }
 $('leetifyCheck').addEventListener('click',()=>void run());$('leetifyRetry').addEventListener('click',()=>void run(true));
 return {reset(name){abort.abort();abort=new AbortController();version++;nickname=name;results=new Map();busy=false;},render(selected){rows=selected;render();}};
}
