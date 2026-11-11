export function summarize(rows) {
  const decided = rows.filter(row => typeof row.won === 'boolean');
  const combat = rows.filter(row => Number.isFinite(row.kills) && Number.isFinite(row.deaths));
  const kills = combat.reduce((sum, row) => sum + row.kills, 0);
  const deaths = combat.reduce((sum, row) => sum + row.deaths, 0);
  const damage = rows.filter(row => Number.isFinite(row.adr) && row.rounds > 0);
  const rounds = damage.reduce((sum, row) => sum + row.rounds, 0);
  return {
    count: rows.length,
    wins: decided.filter(row => row.won).length,
    winrate: decided.length ? decided.filter(row => row.won).length / decided.length : null,
    kd: deaths > 0 ? kills / deaths : null,
    adr: rounds ? damage.reduce((sum, row) => sum + row.adr * row.rounds, 0) / rounds : null,
    adrCoverage: damage.length,
  };
}

export function forecast(rows, elo, now = Date.now()) {
  if (!Number.isFinite(elo)) return null;
  if (elo >= 2001) return {reached: true};
  // Count each match once, excluding series with ambiguous map-level outcomes.
  const counts = new Map();
  for (const row of rows) counts.set(row.matchId, (counts.get(row.matchId) || 0) + 1);
  const recent = rows.filter(row => counts.get(row.matchId) === 1 && typeof row.won === 'boolean' &&
    row.finishedAt * 1000 >= now - 30 * 86400000 && row.finishedAt * 1000 <= now);
  if (recent.length < 10) return {insufficient: true, count: recent.length};
  const wins = recent.filter(row => row.won).length;
  const p = wins / recent.length;
  const net = 25 * (2 * p - 1);
  return {
    winrate: p, count: recent.length, net,
    games: net > 0 ? Math.ceil((2001 - elo) / net - 1e-9) : null,
    // A fixed 30-day window avoids extrapolating a burst of play into daily activity.
    days: net > 0 ? Math.ceil((2001 - elo) / net / (recent.length / 30)) : null,
  };
}
