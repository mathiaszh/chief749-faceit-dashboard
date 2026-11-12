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
 counts.checked=counts.available+counts.missing+counts.error;
 return counts;
}
const labels={available:'Data fundet',missing:'Leetify-data ikke tilgængelige',error:'Leetify-data ikke tilgængelige',access:'Adgang afvist – ikke undersøgt',limited:'Afventer nyt forsøg – ikke undersøgt',pending:'Undersøger…',unchecked:'Ikke undersøgt'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function createCoverage({requestFetch=fetch,now=Date.now,wait=sleep}={}){
 const $=id=>document.getElementById(id);
 let results=new Map(),rows=[],nickname='',busy=false,abort=new AbortController(),version=0,nextRequestAt=0,cooldownUntil=0,cooldownTimer;
 function render(){
  const n=coverageCounts(rows,results),remaining=Math.max(0,Math.ceil((cooldownUntil-now())/1000));
  $('leetifyCoverageSummary').textContent=`${n.available} af ${rows.length} maps i dit valgte udsnit har bekræftede Leetify-data · ${n.checked} opslag gennemført · ${n.unchecked+n.limited+n.access} ikke undersøgt · ${n.pending} hentes`;
  $('leetifyCoverageErrors').textContent=remaining?`Testen holder pause i ${remaining} sekunder, fordi forespørgselsgrænsen er nået. Afviste opslag tæller ikke som undersøgte kampe. Fortsæt derefter med næste 10 maps.`:`${n.missing+n.error} uden tilgængelige Leetify-data · ${n.access} med afvist adgang · ${n.limited} afventer nyt forsøg efter forespørgselsgrænsen. Manglende data tæller aldrig som nul. Årsagen kan ikke fastslås ud fra opslaget alene.`;
  $('leetifyCheck').disabled=busy||remaining>0||!(n.unchecked+n.limited);
  $('leetifyRetry').disabled=busy||remaining>0||!(n.error+n.missing+n.access+n.limited);
  $('leetifyCheck').textContent=remaining?`Vent ${remaining} sekunder`:busy?'Undersøger…':'Undersøg næste 10 maps';
  $('leetifyCoverageRows').innerHTML=rows.map(row=>{const item=results.get(row.matchId)||{state:'unchecked'};return `<tr><td>${row.finishedAt?new Date(row.finishedAt*1000).toLocaleDateString('da-DK'):'—'}</td><td>${esc(row.map)}</td><td class="coverage-${item.state}">${labels[item.state]}</td><td>${item.state==='available'?`${item.fields.length} numeriske statistikfelter tilgængelige`:['missing','error'].includes(item.state)?'Kampens demo er muligvis endnu ikke uploadet eller analyseret hos Leetify. Prøv igen efter upload.':'—'}</td></tr>`;}).join('');
 }
 function showCooldown(){clearTimeout(cooldownTimer);render();if(cooldownUntil>now()){cooldownTimer=setTimeout(showCooldown,1000);cooldownTimer.unref?.();}}
 async function run(retry=false){
  if(busy||!nickname||now()<cooldownUntil)return;
  const selected=[...new Set(rows.filter(r=>{const state=results.get(r.matchId)?.state;return retry?state&&['error','missing','access','limited'].includes(state):!state||state==='limited';}).map(r=>r.matchId))].slice(0,10);
  if(!selected.length)return;
  busy=true;const token=version,name=nickname,signal=abort.signal;render();
  for(const id of selected){
   const delay=Math.max(0,nextRequestAt-now());if(delay)await wait(delay);
   if(token!==version)break;
   // Space starts across batches too: below the server's 20 requests/minute limit.
   nextRequestAt=now()+3200;results.set(id,{state:'pending'});render();
   try{
    const response=await requestFetch('/api/leetify-check?nickname='+encodeURIComponent(name)+'&matchId='+encodeURIComponent(id),{signal,cache:'no-store'});
    const data=await response.json();if(token!==version)return;
    const state=response.ok?classifyLeetify(data):response.status===429?'limited':response.status===503?'access':'error';
    results.set(id,{state,fields:Array.isArray(data.availableFields)?data.availableFields:[]});
    if(state==='limited'){
     const retryAfter=Number(response.headers?.get('Retry-After')||data.retryAfter);
     cooldownUntil=now()+Math.max(60,Number.isFinite(retryAfter)?retryAfter:60)*1000;
     showCooldown();break;
    }
    if(state==='access')break;
   }catch(error){if(token!==version||error.name==='AbortError')return;results.set(id,{state:'error'});}
   render();
  }
  if(token===version){busy=false;render();}
 }
 $('leetifyCheck').addEventListener('click',()=>run());$('leetifyRetry').addEventListener('click',()=>run(true));
 return {reset(name){abort.abort();abort=new AbortController();version++;nickname=name;results=new Map();busy=false;},render(selected){rows=selected;render();}};
}
