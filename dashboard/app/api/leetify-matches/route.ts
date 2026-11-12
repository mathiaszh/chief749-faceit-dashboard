import {ApiError,faceit,validateNickname} from '../../../lib/faceit.mjs';
import {leetify} from '../../../lib/leetify.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0'};
const fields=['leetify_rating','ct_leetify_rating','t_leetify_rating','preaim','reaction_time','counter_strafing_shots_good_ratio','spray_accuracy','accuracy_enemy_spotted','trade_kills_succeed','traded_deaths_succeed','trade_kills_success_percentage','traded_deaths_success_percentage','utility_on_death_avg','flashbang_hit_foe_avg_duration','he_foes_damage_avg'];
export async function GET(request:Request){
 try{
  const nickname=validateNickname(new URL(request.url).searchParams.get('nickname'));
  const player=await faceit('players?nickname='+encodeURIComponent(nickname),process.env.FACEIT_API_KEY);
  const steamId=player.steam_id_64||player.games?.cs2?.game_player_id;
  if(!/^\d{17}$/.test(steamId||''))throw new ApiError('Spilleren mangler et gyldigt Steam-ID.',422);
  const result=await leetify('/v3/profile/matches?steam64_id='+encodeURIComponent(steamId),process.env.LEETIFY_API_KEY);
  if(result.status!==200)return Response.json({error:'Leetify-data kunne ikke hentes.',providerStatus:result.status},{status:result.status===429?429:502,headers});
  if(!Array.isArray(result.data))throw new ApiError('Leetify returnerede et ukendt format.',502);
  const matches=result.data.slice(0,100).map((m:any)=>{
   const s=m.stats?.find((p:any)=>p.steam64_id===steamId);
   return {id:m.id,finishedAt:m.finished_at,source:m.data_source,map:m.map_name,scores:m.team_scores,sourceId:m.data_source_match_id??m.data_source_id??m.faceit_match_id??null,metadataKeys:Object.keys(m),stats:s?Object.fromEntries(fields.map(k=>[k,typeof s[k]==='number'&&Number.isFinite(s[k])?s[k]:null])):null};
  });
  return Response.json({nickname:player.nickname,steamId,matches},{headers});
 }catch(error){return Response.json({error:error instanceof ApiError?error.message:'Leetify-data kunne ikke hentes.'},{status:error instanceof ApiError?error.status:502,headers});}
}
