import {ApiError, getPlayer, validateNickname} from '../../../lib/faceit.mjs';
import {cached} from '../../../lib/faceit-cache';

export async function GET(request: Request) {
  try {
    const nickname = validateNickname(new URL(request.url).searchParams.get('nickname'));
    const configured = Boolean(process.env.FACEIT_API_KEY);
    const data = await cached(`player:${configured}:${nickname.toLowerCase()}`, 300,
      () => getPlayer(nickname, process.env.FACEIT_API_KEY));
    return Response.json(data, {headers:{'Cache-Control':'no-store'}});
  } catch (error) {
    console.error("Player lookup failed:", error instanceof Error ? error.message : "unknown error");
    return Response.json({error:error instanceof ApiError ? error.message : 'Opslaget mislykkedes. Prøv igen om lidt.'},
      {status:error instanceof ApiError ? error.status : 502});
  }
}
