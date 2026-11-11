import {summarize,comparison,consistency,reboundPairs,reboundSummary} from './analytics.mjs';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=1)=>Number.isFinite(n)?n.toLocaleString('da-DK',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=n=>Number.isFinite(n)?fmt(n*100)+' %':'—';
const date=t=>t?new Date(t*1000).toLocaleDateString('da-DK'):'—';
let players=[],controller;
const params=new URLSearchParams(location.search);
for(let i=1;i<=3;i++)if(params.has('p'+i))$('player'+i).value=params.get('p'+i);
function subset(p){const cutoff=Date.now()/1000-Number($('compareDays').value)*86400;return [...p.matches].sort((a,b)=>b.finishedAt-a.finishedAt).filter(r=>($('compareDays').value==='all'||r.finishedAt>=cutoff)&&($('compareMap').value==='all'||r.map===$('compareMap').value)).slice(0,Number($('compareLimit').value));}
const mean=(rows,key)=>{const valid=rows.map(r=>r[key]).filter(Number.isFinite);return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null;};
function render(){if(!players.length)return;const groups=players.map(p=>{const rows=subset(p);return {p,rows,s:summarize(rows),form:comparison(rows),stability:consistency(rows)};});
const head='<thead><tr><th scope="col">Statistik</th>'+groups.map(({p})=>`<th scope="col"><a href="/dashboard.html?nickname=${encodeURIComponent(p.nickname)}">${esc(p.nickname)}</a></th>`).join('')+'</tr></thead>';
const table=(id,metrics)=>{$(id).innerHTML=head+'<tbody>'+metrics.map(([label,fn])=>'<tr><th scope="row">'+esc(label)+'</th>'+groups.map(g=>'<td>'+fn(g)+'</td>').join('')+'</tr>').join('')+'</tbody>';};
table('statsTable',[
 ['Aktuelt ELO / level',g=>`${fmt(g.p.elo,0)} / ${fmt(g.p.level,0)}`],
 ['Maps i udsnittet',g=>`${g.rows.length}${g.rows.length<10?' · lille udsnit':''}<small>${g.rows.length?date(g.rows.at(-1).finishedAt)+' – '+date(g.rows[0].finishedAt):'Ingen kampe matcher filtrene'}</small>`],
 ['Winrate',g=>pct(g.s.winrate)+`<small>${g.s.wins} sejre / ${g.s.losses} nederlag</small>`],
 ['Kills / map',g=>fmt(mean(g.rows,'kills'))],['Deaths / map',g=>fmt(mean(g.rows,'deaths'))],['Assists / map',g=>fmt(mean(g.rows,'assists'))],
 ['K/D',g=>fmt(g.s.kd,2)],['ADR',g=>fmt(g.s.adr)+`<small>Data: ${g.s.adrCoverage} / ${g.rows.length} maps</small>`],['Kills / runde',g=>fmt(g.s.kpr,2)],['Deaths / runde',g=>fmt(g.s.dpr,2)],['Headshots',g=>pct(g.s.hs)],['Multikill-runder',g=>pct(g.s.multi)]
]);
function after(g,rule,threshold,result='all'){const s=reboundSummary(reboundPairs(g.rows,g.p.matches,{rule,threshold,result}));return `${fmt(s.kpr.next,2)} K/R<small>${s.count} kamppar${s.count<10?' · lille grundlag':''} · næste winrate ${pct(s.winrate)}</small>`;}
table('analysisTable',[
 ['Ændring i ADR',g=>{const f=g.form;if(!f||f.recent.adr===null||f.previous.adr===null)return '—<small>For få maps med data</small>';const d=f.recent.adr-f.previous.adr;return `${d>=0?'+':''}${fmt(d)}<small>${f.window} mod ${f.window} maps</small>`;}],
 ['Typisk ADR · median',g=>fmt(g.stability.median)],
 ['Midterste 50 % · ADR',g=>`${fmt(g.stability.low)} – ${fmt(g.stability.high)}`],
 ['Efter et nederlag',g=>after(g,'all',0,'loss')],
 ['Efter under 0,60 kills/runde',g=>after(g,'kprBelow',.6)],
 ['Efter mindst 20 kills',g=>after(g,'killsAtLeast',20)]
]);
table('mapTable',[...new Set(groups.flatMap(g=>g.rows.map(r=>r.map)))].sort().map(map=>[map,g=>{const s=summarize(g.rows.filter(r=>r.map===map));return `${fmt(s.adr)}<small>${s.count} maps · ${pct(s.winrate)} sejre</small>`;}]));
$('comparisonResults').hidden=false;
}
$('compareForm').addEventListener('submit',async e=>{e.preventDefault();const names=[1,2,3].map(i=>$('player'+i).value.trim()).filter(Boolean);$('compareError').hidden=true;if(names.length<2||new Set(names.map(n=>n.toLowerCase())).size!==names.length){$('compareError').textContent='Indtast to eller tre forskellige FACEIT-brugernavne.';$('compareError').hidden=false;return;}controller?.abort();controller=new AbortController();const signal=controller.signal;$('compareButton').disabled=true;$('loadStatus').textContent='Henter spillernes seneste kampe…';$('comparisonResults').hidden=true;players=[];
try{const results=await Promise.all(names.map(async name=>{const r=await fetch('/api/player?nickname='+encodeURIComponent(name),{signal});const d=await r.json();if(!r.ok)throw Error(name+': '+(d.error||'Kunne ikke hente data.'));return {...d,matches:d.matches||[]};}));if(new Set(results.map(p=>p.playerId)).size!==results.length)throw Error('Navnene skal tilhøre forskellige spillere.');players=results;const current=$('compareMap').value;$('compareMap').innerHTML='<option value="all">Alle maps</option>'+[...new Set(players.flatMap(p=>p.matches.map(r=>r.map)))].sort().map(m=>`<option value="${esc(m)}">${esc(m)}</option>`).join('');if([...$('compareMap').options].some(o=>o.value===current))$('compareMap').value=current;const url=new URL(location.href);for(let i=1;i<=3;i++){url.searchParams.delete('p'+i);if(names[i-1])url.searchParams.set('p'+i,names[i-1]);}history.replaceState(null,'',url);render();$('loadStatus').textContent=`${players.length} spillere hentet · højst 100 maps pr. spiller`;
}catch(error){if(error.name!=='AbortError'){$('compareError').textContent=error.message;$('compareError').hidden=false;$('loadStatus').textContent='Sammenligningen kunne ikke hentes.';}}finally{$('compareButton').disabled=false;}});
for(const id of ['compareLimit','compareDays','compareMap'])$(id).addEventListener('change',render);
