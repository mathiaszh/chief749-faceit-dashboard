const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mapKey=s=>String(s||'').toLowerCase().replace(/^de_/,'').replace(/[^a-z0-9]/g,'');
const number=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('da-DK',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
export const leetifyRating=v=>Number.isFinite(v)?(v>0?'+':'')+number(v*100,2):'—';
export function leetifyFor(row,matches){
 const found=matches.filter(m=>m.sourceId===row.matchId&&mapKey(m.map)===mapKey(row.map)&&m.stats);
 return found.length===1?found[0]:null; // Never guess by date or map alone; ambiguous matches stay unavailable.
}
export const metrics=[
 ['leetify_rating','Leetify Rating',leetifyRating,'Bidrag til rundernes udfald. Positiv er over og negativ under kampens nulpunkt.'],
 ['ct_leetify_rating','CT Leetify Rating',leetifyRating,'Din Leetify Rating på CT-siden.'],
 ['t_leetify_rating','T Leetify Rating',leetifyRating,'Din Leetify Rating på T-siden.'],
 ['preaim','Crosshair placement',v=>number(v,2)+'°','Hvor langt sigtet flyttes fra fjenden ses til første skade. Lavere er bedre.'],
 ['reaction_time','Time to Damage',v=>number(v*1000,0)+' ms','Tid fra fjenden ses til første skade. Det er ikke ren reaktionstid. Lavere er bedre.'],
 ['counter_strafing_shots_good_ratio','Proper Counter-Strafing',v=>number(v*100)+' %','Andel af relevante riffelskud med tilstrækkeligt lav bevægelseshastighed.'],
 ['spray_accuracy','Spray Accuracy',v=>number(v*100)+' %','Andel træffere under sprays med en synlig fjende.'],
 ['accuracy_enemy_spotted','Accuracy (Enemy Spotted)',v=>number(v*100)+' %','Træfsikkerhed, når en fjende er synlig.'],
 ['trade_kills_succeed','Trade Kills',v=>number(v,0),'Antal registrerede succesfulde trade kills.'],
 ['traded_deaths_succeed','Traded Deaths',v=>number(v,0),'Antal gange en holdkammerat tradede din død.'],
 ['utility_on_death_avg','Unused Utility on Death',v=>'$'+number(v,0),'Gennemsnitlig værdi af ubrugt utility ved død, målt i spillets dollars.'],
 ['flashbang_hit_foe_avg_duration','Flash Blind Duration',v=>number(v,2)+' s','Leetifys gennemsnitlige blindingsvarighed.'],
 ['he_foes_damage_avg','Damage to Enemies per HE',v=>number(v,1),'Gennemsnitlig skade på fjender pr. HE-granat.']
];
export function metricValue(stats,key){const m=metrics.find(m=>m[0]===key),value=stats?.[key];return m&&Number.isFinite(value)?m[2](value):'—';}
export function matchLink(match){return typeof match?.id==='string'&&/^[a-f\d-]{36}$/i.test(match.id)?'https://leetify.com/app/match-details/'+encodeURIComponent(match.id):'https://leetify.com/';}
export function statsDetails(row,match){
 return `<h2>${esc(row.map)} · ${row.finishedAt?new Date(row.finishedAt*1000).toLocaleDateString('da-DK'):''}</h2><p>Leetify-statistik for denne kamp. Manglende felter vises som —.</p><div class="leetify-metrics">${metrics.map(([key,label,,help])=>`<article><span>${label}</span><strong>${metricValue(match.stats,key)}</strong><small>${help}</small></article>`).join('')}</div><p><a class="leetify-source" href="${matchLink(match)}" target="_blank" rel="noopener">View on Leetify ↗</a></p>`;
}
export function historyLeetifyCell(row,matches,state){
 const match=leetifyFor(row,matches);
 if(match)return `<td><button type="button" class="leetify-rating ${match.stats.leetify_rating>=0?'positive':'negative'}" data-leetify-row="${esc(row.id)}" aria-label="Se Leetify-statistik for ${esc(row.map)}">${leetifyRating(match.stats.leetify_rating)}<small>Se stats</small></button></td>`;
 return `<td><small class="muted">${state==='loading'?'Henter…':state==='error'?'Kunne ikke hentes':'Ingen Leetify-data'}</small></td>`;
}
export function renderLeetifySection(rows,matches,state){
 const $=id=>document.getElementById(id),available=rows.map(row=>({row,match:leetifyFor(row,matches)})).filter(x=>x.match);
 $('leetifyStatus').textContent=state==='loading'?'Henter automatisk Leetify-statistik…':state==='error'?'Leetify kunne ikke svare. Dine FACEIT-statistikker er stadig tilgængelige.':`${available.length} af ${rows.length} maps i dit valgte udsnit har tilgængelige Leetify-statistikker.`;
 $('leetifyRetryStats').hidden=state!=='error';
 $('leetifyMatchRows').innerHTML=available.map(({row,match})=>`<tr><td>${row.finishedAt?new Date(row.finishedAt*1000).toLocaleDateString('da-DK'):'—'}</td><td>${esc(row.map)}</td><td><button class="leetify-rating" type="button" data-leetify-row="${esc(row.id)}">${leetifyRating(match.stats.leetify_rating)}<small>Se alle stats</small></button></td><td>${metricValue(match.stats,'preaim')}</td><td>${metricValue(match.stats,'reaction_time')}</td><td>${metricValue(match.stats,'counter_strafing_shots_good_ratio')}</td><td>${metricValue(match.stats,'spray_accuracy')}</td><td><a class="leetify-source" href="${matchLink(match)}" target="_blank" rel="noopener">View on Leetify ↗</a></td></tr>`).join('')||`<tr><td colspan="8">${state==='loading'?'Statistikkerne vises her, så snart de er hentet.':state==='error'?'Prøv igen om lidt.':'Ingen Leetify-statistikker i dette udsnit. Prøv et andet filter, eller upload en manglende demo til Leetify.'}</td></tr>`;
}
