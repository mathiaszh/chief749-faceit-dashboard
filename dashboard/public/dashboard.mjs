import {reboundPairs,reboundSummary,killsPerRound,summarize,consistency,comparison,sessionGroups,afterResults,winInterval,stat,mergeDetails} from './analytics.mjs';
const $=id=>document.getElementById(id);
const fmt=(n,d=1)=>Number.isFinite(n)?n.toLocaleString('da-DK',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=n=>Number.isFinite(n)?fmt(n*100)+' %':'—';
const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=t=>t?new Date(t*1000).toLocaleDateString('da-DK',{day:'2-digit',month:'short',year:'numeric'}):'—';
let data=null,controller=null,generation=0,rows=[],loading=false,detailMessage='';
const attempted=new Set();
function selected(){if(!data)return [];let a=[...data.matches].sort((a,b)=>b.finishedAt-a.finishedAt);const days=$('days').value;if(days!=='all')a=a.filter(r=>r.finishedAt>=Date.now()/1000-Number(days)*86400);if($('map').value!=='all')a=a.filter(r=>r.map===$('map').value);if($('result').value!=='all')a=a.filter(r=>r.won===($('result').value==='win'));return $('limit').value==='all'?a:a.slice(0,Number($('limit').value));}
function metric(label,value,note){return `<article class="metric"><span class="label">${label}</span><strong>${value}</strong><small>${note}</small></article>`;}
function advanced(label,value,note,count){return `<article><span class="label">${label}</span><strong>${value}</strong><p>${note}</p><small>Datadækning: ${count} / ${rows.length} maps</small></article>`;}
function groupRow(s){return `<tr><td>${esc(s.label)}${s.count<10?' *':''}</td><td>${s.count}</td><td>${pct(s.winrate)}</td><td>${fmt(s.adr)}</td><td>${fmt(s.kd,2)}</td></tr>`;}
function afterResultRow(s){
 const killsPerMap=s.combatCount?s.kills/s.combatCount:null;
 const deathsPerMap=s.combatCount?s.deaths/s.combatCount:null;
 return `<tr><td>${esc(s.label)}${s.count<10?' *':''}</td><td>${s.count}</td><td>${pct(s.winrate)}</td><td>${fmt(killsPerMap)}</td><td>${fmt(deathsPerMap)}</td><td>${fmt(s.kills,0)}</td><td>${fmt(s.deaths,0)}</td><td>${fmt(s.adr)}</td><td>${fmt(s.kd,2)}</td></tr>`;
}
function renderRebound(){
 const threshold=Number($('reboundThreshold').value);
 const rule=$('reboundRule').value;
 if(rule!=='all'&&(!$('reboundThreshold').value||!$('reboundThreshold').checkValidity())){
   $('reboundCount').textContent='Indtast en gyldig grænse';
   $('reboundCards').innerHTML='';$('reboundSummary').innerHTML='';$('reboundPairs').innerHTML='';
   $('reboundInsight').textContent='Grænsen skal være et gyldigt tal på mindst 0.';return;
 }
 const pairs=reboundPairs(rows,data.matches,{rule,threshold,result:$('reboundResult').value,sameSession:$('reboundWindow').value==='session'});
 const s=reboundSummary(pairs);
 const delta=(v,d=2)=>Number.isFinite(v)?(v>0?'+':'')+fmt(v,d):'—';
 $('reboundCount').textContent=`${pairs.length} kamppar${pairs.length<10?' · lille datagrundlag':''}`;
 $('reboundCards').innerHTML=metric('Højere kills / runde',pct(s.kpr.improvementRate),`${s.kpr.increased} af ${s.kpr.count} par`)+metric('Flere kills',pct(s.kills.improvementRate),`${s.kills.increased} af ${s.kills.count} par`)+metric('Kills i næste kamp',fmt(s.kills.next),'Gennemsnit for sammenlignelige par')+metric('Winrate i næste kamp',pct(s.winrate),`${s.decided} kendte resultater`);
 $('reboundInsight').textContent=!pairs.length?'Ingen kamppar matcher. Prøv en anden grænse eller et bredere udsnit.':
 `I ${s.kpr.increased} af ${s.kpr.count} sammenlignelige par steg dine kills pr. runde. De faldt i ${s.kpr.decreased} og var uændrede i ${s.kpr.equal}. ${pairs.length<10?'Der er få observationer; læs det som eksempler, ikke et sikkert mønster.':'Dette beskriver dit valgte udsnit og er ikke en prognose for næste kamp.'}`;
 $('reboundSummary').innerHTML=[['Kills',s.kills,1],['Deaths',s.deaths,1],['Kills / runde',s.kpr,2],['ADR',s.adr,1]].map(([name,m,d])=>`<tr><td>${name}</td><td>${fmt(m.previous,d)}</td><td>${fmt(m.next,d)}</td><td>${delta(m.delta,d)}</td><td>${m.count} / ${pairs.length}</td></tr>`).join('');
 const result=r=>r.won===true?'Sejr':r.won===false?'Nederlag':'—';
 const link=(r,label)=>`<a href="https://www.faceit.com/en/cs2/room/${encodeURIComponent(r.matchId)}" target="_blank" rel="noopener">${label}</a>`;
 $('reboundPairLabel').textContent=`Se de konkrete kamppar (${Math.min(20,pairs.length)} nyeste af ${pairs.length})`;
 $('reboundPairs').innerHTML=pairs.slice(0,20).map(({previous:p,next:n})=>{const a=killsPerRound(p),b=killsPerRound(n);return `<tr><td>${date(p.finishedAt)} → ${date(n.finishedAt)}</td><td>${esc(p.map)} → ${esc(n.map)}</td><td>${result(p)}</td><td>${fmt(p.kills,0)} → ${fmt(n.kills,0)}</td><td>${fmt(p.deaths,0)} → ${fmt(n.deaths,0)}</td><td>${fmt(a,2)} → ${fmt(b,2)}</td><td>${delta(Number.isFinite(a)&&Number.isFinite(b)?b-a:null)}</td><td>${result(n)}</td><td>${link(p,'Før')} · ${link(n,'Efter')}</td></tr>`;}).join('');
}
function render(){
 rows=selected();const s=summarize(rows),c=consistency(rows),compare=comparison(rows);
 $('scope').textContent=`${rows.length} af ${data.matches.length} indlæste maps${rows.length?' · '+date(rows.at(-1).finishedAt)+' – '+date(rows[0].finishedAt):' · Ingen kampe matcher filtrene'}. Periode, map og resultat filtreres før antal.`;
 $('overview').innerHTML=metric('Winrate',pct(s.winrate),`${s.wins} sejre · ${s.losses} nederlag`)+metric('K/D',fmt(s.kd,2),'Samlede kills / deaths')+metric('ADR',fmt(s.adr),`Vægtet · ${s.adrCoverage} maps`)+metric('Kills / runde',fmt(s.kpr,2),'Samlede kills / runder')+metric('Headshots',pct(s.hs),'Headshot-kills / kills')+metric('Multikill-runder',pct(s.multi),'Runder med mindst 2 kills');
 $('combat').innerHTML=[['KILLS',fmt(s.kills,0)],['DEATHS',fmt(s.deaths,0)],['ASSISTS',fmt(s.assists,0)],['DEATHS / RUNDE',fmt(s.dpr,2)]].map(([k,v])=>`<span>${k}<b>${v}</b></span>`).join('');
 let insight='';
 if(compare){const diff=compare.recent.adr-compare.previous.adr,valid=compare.recent.adr!==null&&compare.previous.adr!==null;insight+=`<div class="insight"><strong class="${valid&&diff>=0?'positive':'negative'}">${valid?(diff>=0?'+':'')+fmt(diff)+' ADR':'—'}</strong><p>Seneste ${compare.window} mod foregående ${compare.window} maps i dit udsnit. ${fmt(compare.recent.adr)} mod ${fmt(compare.previous.adr)} ADR.</p></div>`;}else insight+='<div class="insight"><strong>Form kræver 20 maps</strong><p>Udvid dit udsnit for at sammenligne to lige store perioder.</p></div>';
 insight+=`<div class="insight"><strong>${fmt(c.median)} ADR i median</strong><p>Den midterste halvdel af dine maps ligger mellem ${fmt(c.low)} og ${fmt(c.high)} ADR. Baseret på ${c.count} maps.</p></div>`;
 insight+='<div class="insight"><strong>Læs tallene i sammenhæng</strong><p>Map, rolle og modstandere påvirker dine stats. En ændring er et signal at undersøge, ikke en forklaring i sig selv.</p></div>';
 $('insights').innerHTML=insight;
 $('advanced').innerHTML=advanced('Opening-dueller vundet',pct(s.entry.value),`${fmt(s.entry.denominator,0)} forsøg · deltagelse i ${pct(s.entryRate.value)} af runderne`,s.entry.count)+advanced('1v1-clutches vundet',pct(s.clutch1.value),`${fmt(s.clutch1.denominator,0)} registrerede situationer`,s.clutch1.count)+advanced('1v2-clutches vundet',pct(s.clutch2.value),`${fmt(s.clutch2.denominator,0)} registrerede situationer`,s.clutch2.count)+advanced('Utility-skade / runde',fmt(s.utility.value,2),`${fmt(s.utilityUsage.value,2)} utility kastet / runde`,s.utility.count)+advanced('Fjender blindet / flash',fmt(s.flashes.value,2),`${fmt(s.flashes.denominator,0)} flashes kastet`,s.flashes.count)+advanced('Flashes / runde',fmt(s.flashUsage.value,2),'Flash-forbrug fordelt på spillede runder',s.flashUsage.count)+advanced('Opening-dueller / runde',pct(s.entryRate.value),'Hvor ofte du indgår i opening-duellen',s.entryRate.count)+advanced('Utility kastet / runde',fmt(s.utilityUsage.value,2),'FACEITs Utility Count / spillede runder',s.utilityUsage.count);
 $('detailStatus').textContent=detailMessage||`${s.entry.count} / ${rows.length} maps med opening-data`;
 $('maps').innerHTML=[...new Set(rows.map(r=>r.map))].map(map=>({map,...summarize(rows.filter(r=>r.map===map))})).sort((a,b)=>b.count-a.count).map(m=>{const interval=winInterval(m.wins,m.decided);return `<tr><td class="map-name">${esc(m.map)}</td><td>${m.count}</td><td>${pct(m.winrate)}<div class="bar"><i style="width:${(m.winrate||0)*100}%"></i></div></td><td>${interval?fmt(interval[0]*100,0)+'–'+fmt(interval[1]*100,0)+' %':'—'}</td><td>${fmt(m.kd,2)}</td><td>${fmt(m.adr)}</td><td>${pct(m.entry.value)}</td><td>${fmt(m.utility.value,2)}</td></tr>`;}).join('')||'<tr><td colspan="8" class="empty">Ingen maps i dette udsnit</td></tr>';
 $('sessionTable').innerHTML=sessionGroups(rows,data.matches).map(groupRow).join('');$('afterTable').innerHTML=afterResults(rows,data.matches).map(afterResultRow).join('');
 $('matchCount').textContent=`${rows.length} maps · nyeste først`;
 $('matches').innerHTML=rows.map(r=>`<tr><td>${date(r.finishedAt)}</td><td class="map-name">${esc(r.map)}</td><td><span class="badge ${r.won===true?'win':r.won===false?'loss':''}">${r.won===true?'SEJR':r.won===false?'TABT':'—'}</span></td><td>${esc(r.score)}</td><td>${fmt(r.kills,0)} / ${fmt(r.deaths,0)} / ${fmt(r.assists,0)}</td><td>${fmt(r.deaths?r.kills/r.deaths:null,2)}</td><td>${fmt(r.adr)}</td><td>${fmt(r.headshots,0)}</td><td>${fmt(stat(r,'Entry Wins'),0)} / ${fmt(stat(r,'Entry Count'),0)}</td><td>${fmt(stat(r,'Utility Damage'),0)}</td><td><a href="https://www.faceit.com/en/cs2/room/${encodeURIComponent(r.matchId)}" target="_blank" rel="noopener" aria-label="Åbn kamp på FACEIT">↗</a></td></tr>`).join('')||'<tr><td colspan="11" class="empty">Ingen kampe matcher filtrene</td></tr>';
 const recent=data.matches.filter(r=>r.finishedAt>=Date.now()/1000-30*86400),rs=summarize(recent),unique=new Set(recent.map(r=>r.matchId));
 const gain=Number.isFinite(rs.winrate)?25*(2*rs.winrate-1):0,missing=Math.max(0,2001-data.elo);
 $('forecast').textContent=data.elo>=2001?'Spilleren er allerede level 10.':recent.length<10||unique.size!==recent.length?'Der er ikke nok nyere enkeltmap-kampe til et meningsfuldt scenarie.':gain<=0?'Winrate i de seneste 30 dage giver ikke en positiv forventet Elo-ændring med antagelsen om ±25 Elo.':`${fmt(missing,0)} Elo til 2.001. Med ${pct(rs.winrate)} winrate giver en simpel fremskrivning cirka ${Math.ceil(missing/gain)} kampe. Det er et scenarie, ikke en forventet dato eller garanti.`;
 renderRebound();
 draw();
}
function draw(){const canvas=$('chart'),ctx=canvas.getContext('2d'),w=canvas.clientWidth,h=250,dpr=window.devicePixelRatio||1;canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);const metric=$('chartMetric').value;const chronological=[...rows].reverse();const value=r=>metric==='adr'?r.adr:r.rounds>0&&Number.isFinite(r.kills)?r.kills/r.rounds:null;const values=chronological.map(value);const valid=values.filter(Number.isFinite);if(!valid.length){ctx.fillStyle='#9a9da7';ctx.font='13px system-ui';ctx.fillText('Ingen data i det valgte udsnit',25,120);return;}const max=Math.max(metric==='adr'?100:1,...valid)*1.15,L=35,R=w-10,T=16,B=h-30;const x=i=>L+(R-L)*(values.length===1?.5:i/(values.length-1)),y=v=>B-v/max*(B-T);ctx.font='10px system-ui';for(let i=0;i<=4;i++){const v=max*i/4;ctx.strokeStyle='#303238';ctx.beginPath();ctx.moveTo(L,y(v));ctx.lineTo(R,y(v));ctx.stroke();ctx.fillStyle='#9a9da7';ctx.fillText(fmt(v,metric==='adr'?0:1),0,y(v)+3);}values.forEach((v,i)=>{if(!Number.isFinite(v))return;ctx.fillStyle=chronological[i].won?'#85d8aa99':'#f38f8f99';ctx.beginPath();ctx.arc(x(i),y(v),2.8,0,Math.PI*2);ctx.fill();});ctx.strokeStyle='#ff662d';ctx.lineWidth=2.5;ctx.beginPath();let started=false;for(let i=4;i<values.length;i++){const segment=chronological.slice(i-4,i+1).filter(r=>Number.isFinite(value(r))&&r.rounds>0);if(segment.length!==5){started=false;continue;}const avg=segment.reduce((sum,r)=>sum+value(r)*r.rounds,0)/segment.reduce((sum,r)=>sum+r.rounds,0);if(started)ctx.lineTo(x(i),y(avg));else ctx.moveTo(x(i),y(avg));started=true;}ctx.stroke();ctx.fillStyle='#9a9da7';ctx.fillText(date(chronological[0].finishedAt),L,h-6);ctx.textAlign='right';ctx.fillText(date(chronological.at(-1).finishedAt),R,h-6);ctx.textAlign='left';canvas.setAttribute('aria-label',`${metric==='adr'?'ADR':'Kills pr. runde'} over ${rows.length} maps. Individuelle værdier findes i kamptabellen.`);}
async function enrich(token){if(!data?.apiConfigured||!data.playerId)return;const ids=[...new Set(data.matches.filter(r=>stat(r,'Entry Count')===null&&!attempted.has(r.matchId)).map(r=>r.matchId))];if(!ids.length)return;let completed=0,failed=0;ids.forEach(id=>attempted.add(id));const queue=[...ids];async function worker(){while(queue.length&&token===generation){const id=queue.shift();try{const response=await fetch('/api/match?id='+encodeURIComponent(id),{signal:controller.signal});const payload=await response.json();if(!response.ok)throw Error(payload.error);if(token!==generation)return;data.matches=data.matches.map(r=>r.matchId===id?mergeDetails(r,payload,data.playerId):r);}catch(e){if(e.name==='AbortError')return;failed++;}completed++;if(token!==generation)return;detailMessage=`Henter detaljer: ${completed} / ${ids.length}${failed?' · '+failed+' kunne ikke hentes':''}`;render();}}await Promise.all(Array.from({length:3},worker));if(token===generation){detailMessage=failed?`${failed} opslag mislykkedes. Opdater for at prøve igen; datadækning vises på hvert kort.`:'';render();}}
async function requestPlayer(nickname,signal){
 const response=await fetch('/api/player?nickname='+encodeURIComponent(nickname),{signal});
 const result=await response.json();
 if(response.ok)return result;
 if(nickname.toLowerCase()!=='chief749')throw Error(result.error||'Kunne ikke hente spilleren.');
 try{
   const archive=await fetch('https://raw.githubusercontent.com/mathiaszh/chief749-faceit-dashboard/main/web/data/faceit.json?t='+Math.floor(Date.now()/60000),{signal});
   if(!archive.ok)throw Error('Archive unavailable');
   return {...await archive.json(),apiConfigured:false,source:'scheduled'};
 }catch(error){
   if(error.name==='AbortError')throw error;
   const backup=await fetch('/data/faceit.json',{signal});
   if(!backup.ok)throw Error(result.error||'Kunne ikke hente kampdata.');
   return {...await backup.json(),apiConfigured:false,source:'backup'};
 }
}
async function load(nickname){controller?.abort();controller=new AbortController();const token=++generation;loading=true;attempted.clear();detailMessage='';$('searchButton').disabled=true;$('refresh').disabled=true;$('error').hidden=true;$('status').textContent=`Henter ${nickname}…`;try{const result=await requestPlayer(nickname,controller.signal);if(token!==generation)return;data=result;data.matches||=[];$('playerName').textContent=data.nickname;$('nickname').value=data.nickname;$('elo').textContent=fmt(data.elo,0);$('level').textContent=`ELO · LEVEL ${data.level??'—'}`;$('profileLink').href='https://www.faceit.com/en/players/'+encodeURIComponent(data.nickname);$('configuration').hidden=data.apiConfigured;$('status').textContent=`${data.matches.length} maps · ${data.source==='backup'?'Gemte data · live-opdatering utilgængelig':data.source==='scheduled'?'Automatisk arkiv':'Direkte FACEIT-opslag'} · Opdateret ${new Date(data.updatedAt).toLocaleString('da-DK')}`;const map=$('map').value;$('map').innerHTML='<option value="all">Alle maps</option>'+[...new Set(data.matches.map(r=>r.map))].sort().map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join('');if([...$('map').options].some(o=>o.value===map))$('map').value=map;const url=new URL(location.href);url.searchParams.set('nickname',data.nickname);history.replaceState(null,'',url);render();void enrich(token);}catch(e){if(e.name==='AbortError'||token!==generation)return;$('error').textContent=e.message;$('error').hidden=false;$('status').textContent=data?`Viser fortsat ${data.nickname}s senest indlæste data. Opslaget på ${nickname} mislykkedes.`:'Kampdata kunne ikke hentes.';}finally{if(token===generation){loading=false;$('searchButton').disabled=false;$('refresh').disabled=false;}}}
$('search').addEventListener('submit',e=>{e.preventDefault();void load($('nickname').value.trim());});$('refresh').addEventListener('click',()=>void load(data?.nickname||$('nickname').value.trim()));for(const id of ['limit','days','map','result'])$(id).addEventListener('change',()=>{if(data){render();}});$('chartMetric').addEventListener('change',draw);new ResizeObserver(()=>{if(data)draw();}).observe($('chart'));void load(new URL(location.href).searchParams.get('nickname')||'Chief749');

$('reboundThreshold').addEventListener('input',()=>{if(data)renderRebound();});
for(const id of ['reboundResult','reboundWindow','reboundThreshold'])$(id).addEventListener('change',()=>{if(data)renderRebound();});
$('reboundRule').addEventListener('change',()=>{
 const field=$('reboundThreshold'),rule=$('reboundRule').value;
 field.disabled=rule==='all';field.step=rule==='kprBelow'?'0.05':'1';field.max=rule==='kprBelow'?'5':'200';field.value=rule==='kprBelow'?'0.6':'10';
 if(data)renderRebound();
});
