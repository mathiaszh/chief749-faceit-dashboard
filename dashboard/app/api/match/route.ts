import {ApiError, faceit} from '../../../lib/faceit.mjs';
import {cached} from '../../../lib/faceit-cache';

export async function GET(request: Request) {
  try {
    const matchId = new URL(request.url).searchParams.get('id') || '';
    if (!/^[a-zA-Z0-9-]{8,80}$/.test(matchId)) throw new ApiError('Ugyldigt kamp-ID.',400);
    const data = await cached('match:'+matchId, 3600,
      () => faceit(`matches/${matchId}/stats`, process.env.FACEIT_API_KEY));
    return Response.json(data, {headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    return Response.json({error:error instanceof ApiError ? error.message : 'Kampdetaljer kunne ikke hentes.'},
      {status:error instanceof ApiError ? error.status : 502});
  }
}
