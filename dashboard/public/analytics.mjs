export const number = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
export const stat = (row, field) => number(row.sourcePlayerStats?.[field]);
const sum = values => values.reduce((a,b)=>a+b,0);
export const average = values => values.length ? sum(values)/values.length : null;

export function total(rows, field) {
  const values = rows.map(row=>stat(row,field)).filter(Number.isFinite);
  return {value:values.length ? sum(values) : null, count:values.length};
}
export function quotient(rows, numerator, denominator) {
  const eligible = rows.filter(row=>Number.isFinite(stat(row,numerator)) && Number.isFinite(stat(row,denominator)));
  const den = sum(eligible.map(row=>stat(row,denominator)));
  return {value:den>0 ? sum(eligible.map(row=>stat(row,numerator)))/den : null,count:eligible.length,denominator:den};
}
export function perRound(rows, field) {
  const eligible = rows.filter(row=>Number.isFinite(stat(row,field)) && row.rounds>0);
  const rounds = sum(eligible.map(row=>row.rounds));
  return {value:rounds ? sum(eligible.map(row=>stat(row,field)))/rounds : null,count:eligible.length};
}
export function summarize(rows) {
  const combat = rows.filter(row=>Number.isFinite(row.kills)&&Number.isFinite(row.deaths));
  const kills = sum(combat.map(row=>row.kills));
  const deaths = sum(combat.map(row=>row.deaths));
  const damage = rows.filter(row=>Number.isFinite(row.adr)&&row.rounds>0);
  const rounds = sum(damage.map(row=>row.rounds));
  const decided = rows.filter(row=>typeof row.won==='boolean');
  const wins = decided.filter(row=>row.won).length;
  const multiFields = ['Double Kills','Triple Kills','Quadro Kills','Penta Kills'];
  const multi = rows.filter(row=>row.rounds>0 && multiFields.every(field=>Number.isFinite(stat(row,field))));
  return {
    count:rows.length,combatCount:combat.length,wins,losses:decided.length-wins,decided:decided.length,
    winrate:decided.length?wins/decided.length:null,
    kills:combat.length?kills:null,deaths:combat.length?deaths:null,
    assists:total(rows,'Assists').value, kd:deaths?kills/deaths:null,
    adr:rounds?sum(damage.map(row=>row.adr*row.rounds))/rounds:null,adrCoverage:damage.length,
    kpr:perRound(rows,'Kills').value,dpr:perRound(rows,'Deaths').value,
    hs:quotient(rows,'Headshots','Kills').value,
    entry:quotient(rows,'Entry Wins','Entry Count'),entryRate:perRound(rows,'Entry Count'),
    clutch1:quotient(rows,'1v1Wins','1v1Count'),clutch2:quotient(rows,'1v2Wins','1v2Count'),
    utility:perRound(rows,'Utility Damage'),utilityUsage:perRound(rows,'Utility Count'),
    flashes:quotient(rows,'Enemies Flashed','Flash Count'),flashUsage:perRound(rows,'Flash Count'),
    multi:multi.length?sum(multi.flatMap(row=>multiFields.map(field=>stat(row,field))))/sum(multi.map(row=>row.rounds)):null,
  };
}

export function quantile(values, fraction) {
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  const position=(sorted.length-1)*fraction, low=Math.floor(position), high=Math.ceil(position);
  return sorted[low]+(sorted[high]-sorted[low])*(position-low);
}
export function consistency(rows) {
  const values=rows.map(row=>row.adr).filter(Number.isFinite);
  return {count:values.length,median:quantile(values,.5),low:quantile(values,.25),high:quantile(values,.75)};
}
export function comparison(rows) {
  if(rows.length<20)return null;
  const window=Math.min(20,Math.floor(rows.length/2));
  return {window,recent:summarize(rows.slice(0,window)),previous:summarize(rows.slice(window,2*window))};
}

export function sessionPositions(allRows) {
  // End times are available for both sources. A 90-minute gap starts a new session.
  const ascending=[...allRows].filter(row=>row.finishedAt).sort((a,b)=>a.finishedAt-b.finishedAt);
  let previous=null,position=0;
  const positions=new Map();
  const matchPositions=new Map();
  for(const row of ascending) {
    if(matchPositions.has(row.matchId)){positions.set(row.id,matchPositions.get(row.matchId));continue;}
    position=previous===null||row.finishedAt-previous>5400?1:position+1;
    previous=row.finishedAt;positions.set(row.id,position);matchPositions.set(row.matchId,position);
  }
  return positions;
}
export function sessionGroups(rows, allRows) {
  const positions=sessionPositions(allRows);
  return [1,2,3,4].map(index=>({label:index===4?'4. kamp og senere':`${index}. kamp`,
    ...summarize(rows.filter(row=>index===4?positions.get(row.id)>=4:positions.get(row.id)===index))}));
}
export function afterResults(rows, allRows) {
  const ascending=[...allRows].sort((a,b)=>a.finishedAt-b.finishedAt);
  const previous=new Map();
  for(let i=1;i<ascending.length;i++){
    if(ascending[i].matchId!==ascending[i-1].matchId && ascending[i].finishedAt-ascending[i-1].finishedAt<=5400)
      previous.set(ascending[i].id,ascending[i-1].won);
  }
  return [true,false].map(won=>({label:won?'Efter sejr':'Efter nederlag',...summarize(rows.filter(row=>previous.get(row.id)===won))}));
}
export function winInterval(wins,n) {
  if(!n)return null;
  const z=1.96,p=wins/n,den=1+z*z/n;
  const centre=(p+z*z/(2*n))/den;
  const half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;
  return [centre-half,centre+half];
}
export function mergeDetails(row, payload, playerId) {
  for(const round of payload.rounds||[]) {
    if(String(round.round_stats?.Map||'').replace(/^de_/,'')!==row.map)continue;
    const player=(round.teams||[]).flatMap(team=>team.players||[]).find(p=>p.player_id===playerId);
    if(player)return {...row,sourcePlayerStats:{...row.sourcePlayerStats,...player.player_stats},sourceRoundStats:round.round_stats};
  }
  return row;
}

export const killsPerRound = row => Number.isFinite(row.kills) && row.rounds > 0 ? row.kills / row.rounds : null;

// Select trigger games first, then find the immediate successor in full history.
// Series with several map rows are excluded; never skip across them to make a pair.
export function reboundPairs(selectedPrevious, allRows, {rule='kprBelow',threshold=.6,result='all',sameSession=false}={}) {
  const selected=new Set(selectedPrevious.map(row=>row.id));
  const grouped=new Map();
  for(const row of allRows){
    const group=grouped.get(row.matchId)||[];
    group.push(row);grouped.set(row.matchId,group);
  }
  const games=[...grouped.values()].sort((a,b)=>(a[0].finishedAt||0)-(b[0].finishedAt||0));
  const pairs=[];
  for(let i=0;i<games.length-1;i++){
    if(games[i].length!==1||games[i+1].length!==1)continue;
    const previous=games[i][0],next=games[i+1][0];
    if(!selected.has(previous.id)||!previous.finishedAt||!next.finishedAt)continue;
    const gap=next.finishedAt-previous.finishedAt;
    if(gap<=0||(sameSession&&gap>5400))continue;
    if(result!=='all'&&previous.won!==(result==='win'))continue;
    const kpr=killsPerRound(previous);
    if(rule==='kprBelow'&&(!Number.isFinite(kpr)||!(kpr<threshold)))continue;
    if(rule==='killsAtMost'&&(!Number.isFinite(previous.kills)||!(previous.kills<=threshold)))continue;
    if(rule==='killsAtLeast'&&(!Number.isFinite(previous.kills)||!(previous.kills>=threshold)))continue;
    if(rule==='killsExactly'&&(!Number.isFinite(previous.kills)||previous.kills!==threshold))continue;
    pairs.push({previous,next});
  }
  return pairs.sort((a,b)=>b.previous.finishedAt-a.previous.finishedAt);
}
export function pairedMetric(pairs,getValue){
  const values=pairs.map(({previous,next})=>[getValue(previous),getValue(next)])
    .filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b));
  const changes=values.map(([a,b])=>b-a);
  const increased=changes.filter(d=>d>1e-9).length;
  const decreased=changes.filter(d=>d< -1e-9).length;
  return {count:values.length,previous:average(values.map(v=>v[0])),next:average(values.map(v=>v[1])),
    delta:average(changes),increased,decreased,equal:values.length-increased-decreased,
    improvementRate:values.length?increased/values.length:null};
}
export function reboundSummary(pairs){
  const metric=getValue=>pairedMetric(pairs,getValue);
  const decided=pairs.filter(p=>typeof p.next.won==='boolean');
  return {count:pairs.length,kills:metric(r=>r.kills),deaths:metric(r=>r.deaths),kpr:metric(killsPerRound),adr:metric(r=>r.adr),
    winrate:decided.length?decided.filter(p=>p.next.won).length/decided.length:null,decided:decided.length};
}
