const BASE = 'https://open.faceit.com/data/v4/';
const SAVED = 'https://raw.githubusercontent.com/mathiaszh/chief749-faceit-dashboard/main/web/data/faceit.json';

export class ApiError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

export function validateNickname(value) {
  const nickname = (value || '').trim();
  if (!nickname || nickname.length > 64 || /[\x00-\x1f\x7f]/.test(nickname)) {
    throw new ApiError('Indtast et FACEIT-brugernavn på 1–64 tegn.', 400);
  }
  return nickname;
}

export function numeric(value) {
  if (value === null || value === undefined || value === '') return null;
  const result = Number(String(value).replace(/%$/, ''));
  return Number.isFinite(result) ? result : null;
}

export function normalizeBulk(item) {
  const s = item.stats || {};
  const finished = numeric(s['Match Finished At']);
  return {
    id: `${s['Match Id']}:${s['Match Round'] || 1}`,
    matchId: s['Match Id'],
    finishedAt: finished === null ? null : finished / 1000,
    map: String(s.Map || 'Ukendt').replace(/^de_/, ''),
    won: s.Result === '1' || s.Result === 1 ? true : s.Result === '0' || s.Result === 0 ? false : null,
    score: s.Score || null,
    kills: numeric(s.Kills), deaths: numeric(s.Deaths), assists: numeric(s.Assists),
    adr: numeric(s.ADR), headshots: numeric(s['Headshots %']), rounds: numeric(s.Rounds),
    sourcePlayerStats: s, sourceRoundStats: {Map:s.Map, Rounds:s.Rounds},
  };
}

export async function faceit(path, key, requestFetch = fetch) {
  if (!key) throw new ApiError('Spillersøgning mangler FACEIT_API_KEY på serveren. Chief749s automatisk gemte data kan stadig vises.', 503);
  let response;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await requestFetch(BASE + path, {headers:{Authorization:`Bearer ${key}`}, signal:AbortSignal.timeout(15000)});
    } catch { throw new ApiError('FACEIT svarede ikke i tide. Prøv igen om lidt.', 504); }
    if ((response.status === 429 || response.status >= 500) && attempt === 0) {
      await new Promise(resolve => setTimeout(resolve,1000));
      continue;
    }
    break;
  }
  if (!response.ok) {
    const message = response.status === 404 ? 'Spilleren eller kampen blev ikke fundet på FACEIT.' :
      response.status === 429 ? 'FACEIT begrænser antallet af opslag. Prøv igen om lidt.' :
      [401,403].includes(response.status) ? 'FACEIT afviser serverens API-nøgle. Ejeren skal kontrollere opsætningen.' : 'FACEIT kunne ikke levere data lige nu.';
    throw new ApiError(message, response.status === 404 ? 404 : response.status === 429 ? 429 : 502);
  }
  return response.json();
}

export async function getPlayer(nickname, key, requestFetch = fetch) {
  nickname = validateNickname(nickname);
  if (!key && nickname.toLowerCase() === 'chief749') {
    const response = await requestFetch(SAVED + '?t=' + Math.floor(Date.now()/60000), {signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new ApiError('De gemte kampdata kunne ikke hentes. Prøv igen.');
    const data = await response.json();
    return {...data, playerId: data.playerId || null, apiConfigured:false, source:'scheduled'};
  }
  const profile = await faceit('players?' + new URLSearchParams({nickname,game:'cs2'}), key, requestFetch);
  if (!profile.games?.cs2) throw new ApiError('Spilleren har ingen CS2-profil på FACEIT.', 404);
  const bulk = await faceit(`players/${encodeURIComponent(profile.player_id)}/games/cs2/stats?limit=100`, key, requestFetch);
  const rows = (bulk.items || []).map(normalizeBulk).filter(row => row.matchId);
  const unique = [...new Map(rows.map(row=>[row.id,row])).values()];
  return {
    nickname:profile.nickname, playerId:profile.player_id, country:profile.country,
    elo:profile.games.cs2.faceit_elo, level:profile.games.cs2.skill_level,
    updatedAt:new Date().toISOString(), matches:unique.sort((a,b)=>(b.finishedAt||0)-(a.finishedAt||0)),
    eloSnapshots:[], apiConfigured:true, source:'live',
  };
}

export function mergeDetails(row, payload, playerId) {
  for (const round of payload.rounds || []) {
    const map = String(round.round_stats?.Map || '').replace(/^de_/, '');
    if (map !== row.map) continue;
    const players = (round.teams || []).flatMap(team=>team.players || []);
    const player = players.find(p=>p.player_id === playerId);
    if (player) return {...row, sourcePlayerStats:{...row.sourcePlayerStats,...player.player_stats}, sourceRoundStats:round.round_stats};
  }
  return row;
}
