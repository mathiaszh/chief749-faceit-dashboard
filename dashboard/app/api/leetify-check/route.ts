import {ApiError,faceit,validateNickname} from '../../../lib/faceit.mjs';
import {leetify,availableFields} from '../../../lib/leetify.mjs';

// Capability probe only: no Leetify metric values are stored, logged or displayed.
// A future public stats view must include the provider's required attribution.
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0'};
let active=0,windowStart=0,requests=0;
export async function GET(request:Request){
 const now=Date.now();if(now-windowStart>60000){windowStart=now;requests=0;}
 if(active>=2||requests>=20){
  const retryAfter=requests>=20?Math.max(1,Math.ceil((windowStart+60000-now)/1000)):5;
  return Response.json({error:'Forespørgselsgrænsen er nået. Prøv igen senere.',retryAfter},{status:429,headers:{...headers,'Retry-After':String(retryAfter)}});
 }
 requests++;active++;
 try{
  const query=new URL(request.url).searchParams;
  const nickname=validateNickname(query.get('nickname'));
  const matchId=query.get('matchId');
  if(matchId&&!/^1-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchId))throw new ApiError('Ugyldigt FACEIT-kamp-ID.',400);
  const key=process.env.LEETIFY_API_KEY;
  if(!key)throw new ApiError('LEETIFY_API_KEY mangler på serveren.',503);
  const player=await faceit('players?nickname='+encodeURIComponent(nickname),process.env.FACEIT_API_KEY);
  const steamId=player.steam_id_64||player.games?.cs2?.game_player_id;
  if(!/^\d{17}$/.test(steamId||''))throw new ApiError('Spilleren mangler et gyldigt Steam-ID.',422);
  if(matchId){
   const result=await leetify('/v2/matches/faceit/'+encodeURIComponent(matchId),key);
   const stats=result.data?.stats?.find((p:{steam64_id:string})=>p.steam64_id===steamId);
   return Response.json({nickname:player.nickname,matchId,providerStatus:result.status,playerFound:Boolean(stats),availableFields:availableFields(stats)},{headers});
  }
  const validation=await leetify('/api-key/validate',key);
  if(validation.status!==200)return Response.json({keyValid:false,providerStatus:validation.status},{headers});
  const result=await leetify('/v3/profile?steam64_id='+encodeURIComponent(steamId),key);
  return Response.json({nickname:player.nickname,keyValid:true,profileStatus:result.status,profileAvailable:result.status===200,availableStatFields:availableFields(result.data?.stats),availableRatingFields:availableFields(result.data?.rating)},{headers});
 }catch(error){return Response.json({error:error instanceof ApiError?error.message:'Leetify-testen mislykkedes.'},{status:error instanceof ApiError?error.status:502,headers});}
 finally{active--;}
}
