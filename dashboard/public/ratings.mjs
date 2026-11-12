// Experimental, descriptive statistics. Fixed reference; never fit to the visible filters.
export const WEIGHTS={adr:.30,kpr:.25,dpr:-.15,od:.20,fpr:.10};
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const numeric=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
export function ratingInputs(row){
 const s=row.sourcePlayerStats||{},rounds=numeric(row.rounds);
 const adr=numeric(row.adr),kills=numeric(row.kills),deaths=numeric(row.deaths),entries=numeric(s['Entry Count']),wins=numeric(s['Entry Wins']),flashed=numeric(s['Enemies Flashed']);
 if(!rounds||rounds<0||[adr,kills,deaths,entries,wins,flashed].some(v=>v===null||v<0)||wins>entries)return null;
 return {adr,kpr:kills/rounds,dpr:deaths/rounds,od:(2*wins-entries)/rounds,fpr:flashed/rounds};
}
export function haldRating(row,reference){
 const inputs=ratingInputs(row);
 if(!inputs||!reference?.metrics)return {score:null,reason:'Mangler nødvendige kampdata'};
 const parts=[];
 for(const [key,weight] of Object.entries(WEIGHTS)){
  const baseline=reference.metrics[key];
  if(!finite(baseline?.mean)||!finite(baseline?.sd)||baseline.sd<=0)return {score:null,reason:'Referencegrundlaget er utilgængeligt'};
  const z=(inputs[key]-baseline.mean)/baseline.sd;
  parts.push({key,value:inputs[key],z,contribution:.20*weight*z});
 }
 const raw=1+parts.reduce((sum,p)=>sum+p.contribution,0);
 return {score:Math.min(2,Math.max(0,raw)),raw,parts,version:reference.version};
}
export function rateHistory(rows,reference){
 // Keep one entry per map; exclude the current match and equal/unknown timestamps from history.
 const unique=[...new Map(rows.map(r=>[r.id,r])).values()];
 const results=new Map(unique.map(row=>[row.id,{...haldRating(row,reference),personal:null,historyCount:0,historyScope:'all'}]));
 for(const row of unique){
  const result=results.get(row.id);
  if(result.score===null||!finite(row.finishedAt)||row.finishedAt<=0)continue;
  const prior=unique.filter(r=>finite(r.finishedAt)&&r.finishedAt>0&&r.finishedAt<row.finishedAt&&r.matchId!==row.matchId).sort((a,b)=>b.finishedAt-a.finishedAt).slice(0,100);
  const complete=prior.filter(r=>results.get(r.id).score!==null);
  const same=complete.filter(r=>r.map===row.map);
  const sample=same.length>=20?same:complete;
  result.historyScope=same.length>=20?'map':'all';result.historyCount=sample.length;
  if(sample.length<20)continue;
  const scores=sample.map(r=>results.get(r.id).score);
  const lower=scores.filter(s=>s<result.score-1e-10).length;
  const equal=scores.filter(s=>Math.abs(s-result.score)<=1e-10).length;
  result.personal=100*(lower+.5*equal)/scores.length;
 }
 return results;
}
