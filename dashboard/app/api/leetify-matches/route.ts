import {ApiError,faceit,validateNickname} from '../../../lib/faceit.mjs';
import {leetify} from '../../../lib/leetify.mjs';
import {selectLeetifyMatches} from '../../../lib/leetify-matches.mjs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store, max-age=0'};
let active=0,windowStart=0,requests=0;
export async function GET(request:Request){
 const now=Date.now();if(now-windowStart>=60000){windowStart=now;requests=0;}
 if(active>=3||requests>=20)return Response.json({error:'Vent et minut, og prøv igen.'},{status:429,headers:{...headers,'Retry-After':'60'}});
 requests++;active++;
 try{
  const nickname=validateNickname(new URL(request.url).searchParams.get('nickname'));
  const player=await faceit('players?nickname='+encodeURIComponent(nickname),process.env.FACEIT_API_KEY);
  const steamId=player.steam_id_64||player.games?.cs2?.game_player_id;
  if(!/^\d{17}$/.test(steamId||''))throw new ApiError('Spilleren mangler et gyldigt Steam-ID.',422);
  const result=await leetify('/v3/profile/matches?steam64_id='+encodeURIComponent(steamId),process.env.LEETIFY_API_KEY);
  if(result.status!==200)return Response.json({error:'Leetify-data kunne ikke hentes.',providerStatus:result.status},{status:result.status===429?429:502,headers});
  return Response.json({nickname:player.nickname,matches:selectLeetifyMatches(result.data,steamId)},{headers});
 }catch(error){return Response.json({error:error instanceof ApiError?error.message:'Leetify-data kunne ikke hentes.'},{status:error instanceof ApiError?error.status:502,headers});}
 finally{active--;}
}
