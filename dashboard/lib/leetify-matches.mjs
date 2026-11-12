// Keep only the requested player's display fields; no persistent Leetify storage.
const fields=['leetify_rating','ct_leetify_rating','t_leetify_rating','preaim','reaction_time','counter_strafing_shots_good_ratio','spray_accuracy','accuracy_enemy_spotted','trade_kills_succeed','traded_deaths_succeed','utility_on_death_avg','flashbang_hit_foe_avg_duration','he_foes_damage_avg'];
export function selectLeetifyMatches(payload,steamId){
 if(!Array.isArray(payload))throw new Error('Unexpected Leetify history format');
 return payload.filter(m=>String(m.data_source).toLowerCase()==='faceit'&&/^1-[\da-f-]{36}$/i.test(m.data_source_match_id||''))
 .sort((a,b)=>Date.parse(b.finished_at)-Date.parse(a.finished_at)).slice(0,100).map(m=>{
  const s=m.stats?.find(p=>p.steam64_id===steamId);
  return {id:typeof m.id==='string'?m.id:null,finishedAt:m.finished_at,sourceId:m.data_source_match_id,map:m.map_name,
   stats:s?Object.fromEntries(fields.map(k=>[k,typeof s[k]==='number'&&Number.isFinite(s[k])?s[k]:null])):null};
 });
}
