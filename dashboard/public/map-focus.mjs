import {average, perRound, quotient, stat} from './analytics.mjs';
import {ctPositions, mapKey} from './ct-positions.mjs';
import {coloredLeetifyRating, leetifyFor} from './leetify-stats.mjs';

const value = (entry, key) => entry.stats?.[key];
const mean = (entries, key) => average(entries.map(entry => value(entry,key)));
const decimal = (n, digits=0) => n.toLocaleString('da-DK',{maximumFractionDigits:digits});
const wholeMap = 'Tallene gælder hele kampen på mappet.';
const limitNote = (map, other) => `(${map.length} kampe på mappet og ${other.length} på andre maps).`;

function sideSummary(entries, key) {
  const values = entries.map(entry => value(entry,key)).sort((a,b)=>a-b);
  const mid = Math.floor(values.length/2);
  return {
    average: average(values),
    median: values.length ? (values.length%2 ? values[mid] : (values[mid-1]+values[mid])/2) : null,
    positive: values.filter(rating=>rating>0).length,
  };
}

export function mapSideRatings(entries) {
  const paired = entries.filter(({stats}) =>
    Number.isFinite(stats?.ct_leetify_rating)&&Number.isFinite(stats?.t_leetify_rating));
  return {count:paired.length,t:sideSummary(paired,'t_leetify_rating'),ct:sideSummary(paired,'ct_leetify_rating')};
}

const utility = 'utility_on_death_avg';
const strafing = 'counter_strafing_shots_good_ratio';
const damageTime = 'reaction_time';
const rules = [
  {
    eligible: entry => Number.isFinite(value(entry,utility)),
    find(map,other) {
      const a=mean(map,utility), b=mean(other,utility);
      if(a-b<100)return;
      return {
        title:'Få utility i spil tidligere',
        evidence:`Gennemsnitligt ${decimal(a)} $ i ubrugt utility ved død mod ${decimal(b)} $ på dine andre maps ${limitNote(map,other)}`,
        action:'Har du en flash, så brug den fra dækning før dit første peek. På næste buy kan du tjekke, om du stadig køber granater, du sjældent får kastet.',
      };
    },
  },
  {
    eligible: entry=>[strafing,damageTime].every(key=>Number.isFinite(value(entry,key))),
    find(map,other) {
      const a=mean(map,strafing), b=mean(other,strafing), t=mean(map,damageTime), u=mean(other,damageTime);
      if(b-a<0.05||t-u<0.04)return;
      return {
        title:'Sæt fødderne før det første skud',
        evidence:`${decimal(a*100,1)} % proper counter-strafing og ${decimal(t*1000)} ms til første skade mod ${decimal(b*100,1)} % og ${decimal(u*1000)} ms på dine andre maps ${limitNote(map,other)}`,
        action:'Tag én vinkel ad gangen, og fokusér på at stå stille før dit første riffelskud.',
      };
    },
  },
  {
    eligible: ({row})=>row.rounds>0&&['Entry Count','Entry Wins'].every(key=>Number.isFinite(stat(row,key))),
    find(map,other) {
      const mapRows=map.map(entry=>entry.row), otherRows=other.map(entry=>entry.row);
      const mapRate=perRound(mapRows,'Entry Count').value, otherRate=perRound(otherRows,'Entry Count').value;
      const a=quotient(mapRows,'Entry Wins','Entry Count'), b=quotient(otherRows,'Entry Wins','Entry Count');
      if(a.denominator<10||b.denominator<10)return;
      const evidence=`Du vinder ${decimal(a.value*100,1)} % af dine opening-dueller (${a.denominator} forsøg) mod ${decimal(b.value*100,1)} % på dine andre maps (${b.denominator} forsøg) ${limitNote(map,other)}`;
      if(mapRate-otherRate>=0.04&&b.value-a.value>=0.10)return {
        title:'Gør din første duel lettere', evidence,
        action:'Skær dit første peek smallere, så kun én vinkel er åben. Er der flere vinkler på dig, så træk ind og brug en flash før næste peek.',
      };
      if(a.value-b.value>=0.12)return {
        title:'Byg videre på dine openings', evidence,
        action:'Efter dit første kill kan du tage den plads, modstanderen lige har givet op. Find dækning dér, før du søger næste duel.',
      };
    },
  },
];

export function mapComment(current,baseline) {
  for(const rule of rules){
    const map=current.filter(rule.eligible), other=baseline.filter(rule.eligible);
    if(map.length<5||other.length<10)continue;
    const comment=rule.find(map,other);
    if(comment)return comment;
  }
  return null;
}

function setSide(id,side){
  document.getElementById(id).innerHTML = [
    ['Gennemsnit',coloredLeetifyRating(side.average)],
    ['Median',coloredLeetifyRating(side.median)],
    ['Positiv rating',side.count ? `${side.positive} af ${side.count}` : '—'],
  ].map(([label,rating])=>`<div><dt>${label}</dt><dd>${rating}</dd></div>`).join('');
}

const tFocus = {
  nuke:'Krydser du Outside mod Secret, så tjek samlingen mellem smokes fra Red. Et hul giver Garage frit udsyn til dit kryds.',
  mirage:'På vej ud fra Top Mid kan du bruge kasserne til at lukke Window, mens du tjekker Connector. Tjek Short, før du går videre ud i Mid.',
  inferno:'På vej op ad Banana kan du bruge en molotov til Sandbags. Hold Car, mens ilden breder sig, og tjek Sandbags igen, hvis ilden bliver slukket.',
  dust2:'Stop inden den yderste Long Door, og lyt efter CT-utility. Brug en flash over dørene, før du går bredt ud mod Long Corner.',
  ancient:'Når du går ud fra A Main, så brug kanten af åbningen til at tjekke de nære vinkler først. Gå et skridt videre, når du er klar til at møde Donut.',
  anubis:'Fra Water kan du høre rotation gennem B Connector. Tjek den nære dørkarm, før du flytter sigtet længere ind mod B.',
  cache:'På vej ud fra Garage skal du tjekke White Box, før du løber mod Vent. Hold dig ved kanten af Garage, mens Z stadig er åben.',
  overpass:'Når du tager Toilets fra Fountain, så ryd én døråbning ad gangen. Stop ved den sidste væg, før du viser dig for A-site.',
  train:'Fra Ivy kan du bruge dørkarmen til at skære vinklerne mellem togene én ad gangen. Stop ved første åbne linje, før du går længere ud.',
  vertigo:'På vej op ad A Ramp kan du kaste en molotov bag Sandbags fra dækning. Hold kanten af ilden, før du går videre mod site.',
};

export function renderMapFocus({map,rows,baseline,matches,state}){
  const $ = id => document.getElementById(id);
  const entries = games => games.map(row=>({row,stats:leetifyFor(row,matches)?.stats}));
  const current=entries(rows);
  const ratings=mapSideRatings(current);
  setSide('mapFocusTStats',{...ratings.t,count:ratings.count});
  setSide('mapFocusCTStats',{...ratings.ct,count:ratings.count});
  $('mapFocusCoverage').textContent=state==='loading'?'Henter Leetify Rating…':
    state==='error'?'Leetify Rating kunne ikke hentes.':
    `${ratings.count} af ${rows.length} kampe med rating på begge sider.`;

  const difference = ratings.ct.average-ratings.t.average;
  const side = ratings.count>=5 && Math.abs(difference)>=0.02 ? difference<0?'CT':'T':null;
  $('mapFocusPriority').textContent=side ? `Prioritér ${side} i næste kamp. Din gennemsnitlige rating ligger ${decimal(Math.abs(difference)*100,2)} point lavere på den side.` : '';
  $('mapFocusTAdvice').textContent=tFocus[mapKey(map)]??'Vælg din første indgang, og ryd den nærmeste vinkel fra dækning før dit næste peek.';
  const positions = Object.hasOwn(ctPositions,mapKey(map)) ? ctPositions[mapKey(map)] : [];
  const picker=$('mapFocusPosition');
  const selected=picker.dataset.map===map?picker.value:'';
  if(picker.dataset.map!==map){
    picker.dataset.map=map;
    picker.replaceChildren(new Option('Vælg CT-position',''));
    for(const [name] of positions)picker.add(new Option(name,name));
    picker.value=selected;
  }
  $('mapFocusPositionLabel').hidden=!positions.length;
  $('mapFocusCTAdvice').textContent=positions.find(([name])=>name===selected)?.[1]
    ?? (positions.length ? 'Vælg den position, du spiller, for at se dit CT-råd.' : 'Hold din første vinkel tæt på dækning, så du kan skifte position efter kontakt.');

  const comment = mapComment(current,entries(baseline));
  $('mapFocusComment').hidden=!comment;
  $('mapFocusCommentTitle').textContent=comment?.title??'';
  $('mapFocusCommentEvidence').textContent=comment?`${comment.evidence} ${wholeMap}`:'';
  $('mapFocusCommentAdvice').textContent=comment?.action??'';
}
