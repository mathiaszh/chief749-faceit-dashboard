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
        action:'Vælg før runden, hvad der skal udløse din første granat. Aftal med makkeren, hvem der gemmer sin til næste kontakt.',
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
        title:'Tag første duel med en makker', evidence,
        action:'Aftal hvem der følger din første duel, og vent på at makkeren er tæt nok på til at trade.',
      };
      if(a.value-b.value>=0.12)return {
        title:'Byg videre på dine openings', evidence,
        action:'Aftal hvem der tager plads sammen med dig efter første kill, så holdet får noget ud af fordelen.',
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
  nuke:'Aftal om første kontakt kommer fra Outside eller Lobby. Lad spilleren med første kontakt melde, før I deler jer mod Ramp og Upper.',
  mirage:'Aftal hvem der tager første kontakt i Mid, og hvem der følger fra Underpass eller Top Mid, før I går frem.',
  inferno:'Aftal hvem der tager første kontakt på Banana. Hold en afstand hvor den næste spiller kan trade uden at stå i samme granat.',
  dust2:'På Long skal én tage første kontakt og én følge. Kald hvem der bliver ved hjørnet, når første spiller går frem.',
  ancient:'Aftal om I tager første plads i Mid eller ved B Ramp. Send en makker med den første spiller, så I kan trade kontakten.',
  anubis:'Fordel første kontakt i Mid og Water, og vent på hinandens melding, før I tager plads på hver sin side.',
  cache:'Aftal hvem der tager første duel i Mid og hvem der følger. Meld når Z er dækket, før næste spiller krydser.',
  overpass:'Aftal om I tager første kontakt ved Toilets eller Connector, og hvem der følger den spiller, der går først.',
  train:'Aftal timingen mellem A Main og Ivy, så spilleren med første kontakt kan få hjælp fra den anden indgang.',
  vertigo:'Gå to sammen frem på A Ramp. Aftal hvem der kalder stop, hvis den første spiller bliver bremset af utility.',
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
  $('mapFocusTAdvice').textContent=tFocus[mapKey(map)]??'Aftal hvem der tager første kontakt, og hvem der følger tæt nok til at trade eller tage plads sammen med dig.';
  const positions = Object.hasOwn(ctPositions,mapKey(map)) ? ctPositions[mapKey(map)] : [];
  const picker=$('mapFocusPosition');
  const selected=picker.dataset.map===map?picker.value:'';
  if(picker.dataset.map!==map){
    picker.dataset.map=map;
    picker.replaceChildren(new Option('Vælg CT-position',''));
    for(const [names] of positions){
      for(const name of names.split('|'))picker.add(new Option(name,name));
    }
    picker.value=selected;
  }
  $('mapFocusPositionLabel').hidden=!positions.length;
  $('mapFocusCTAdvice').textContent=positions.find(([names])=>names.split('|').includes(selected))?.[1]
    ?? 'Aftal hvem der tager første kontakt, hvor du falder hen ved pres, og hvem der dækker dit fald.';

  const comment = mapComment(current,entries(baseline));
  $('mapFocusComment').hidden=!comment;
  $('mapFocusCommentTitle').textContent=comment?.title??'';
  $('mapFocusCommentEvidence').textContent=comment?`${comment.evidence} ${wholeMap}`:'';
  $('mapFocusCommentAdvice').textContent=comment?.action??'';
}
