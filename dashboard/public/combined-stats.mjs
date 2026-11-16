import {average, pairedMetric, summarize} from './analytics.mjs';
import {coloredLeetifyRating, leetifyFor, matchLink, metrics} from './leetify-stats.mjs';

export const leetifyRules = {
  ct_leetify_rating: {unit:'rating', min:-100, max:100, step:0.01, initial:-5, scale:100, direction:'below'},
  t_leetify_rating: {unit:'rating', min:-100, max:100, step:0.01, initial:-5, scale:100, direction:'below'},
  reaction_time: {unit:'ms', min:0, max:10000, step:1, initial:550, scale:1000, direction:'above'},
  counter_strafing_shots_good_ratio: {unit:'%', min:0, max:100, step:0.1, initial:75, scale:100, direction:'below'},
  utility_on_death_avg: {unit:'$ i spillet', min:0, max:10000, step:1, initial:500, scale:1, direction:'above'},
};

export function passesLeetifyThreshold(value, rule, threshold, direction) {
  if (!Number.isFinite(value)) return false;
  const boundary = threshold / rule.scale;
  return direction === 'above' ? value > boundary : value < boundary;
}

const mapFields = new Set([
  'leetify_rating','ct_leetify_rating','t_leetify_rating','reaction_time',
  'counter_strafing_shots_good_ratio','spray_accuracy','trade_kills_succeed','utility_on_death_avg',
]);
const followupFields = new Set([
  'leetify_rating','reaction_time','counter_strafing_shots_good_ratio',
  'trade_kills_succeed','utility_on_death_avg',
]);

function leetifyFormat(key, format) {
  if (key === 'trade_kills_succeed') return value => Number.isFinite(value) ? decimal(value) : '—';
  return key.endsWith('leetify_rating') ? coloredLeetifyRating :
    value => Number.isFinite(value) ? format(value) : '—';
}

const decimal = value => value.toLocaleString('da-DK',{minimumFractionDigits:1,maximumFractionDigits:1});
const changes = {
  leetify_rating: coloredLeetifyRating,
  reaction_time: value => signed(value*1000,' ms'),
  counter_strafing_shots_good_ratio: value => signed(value*100,' procentpoint'),
  trade_kills_succeed: value => signed(value,''),
  utility_on_death_avg: value => signed(value,' $'),
};
function signed(value,unit) {
  return Number.isFinite(value) ? (value>0?'+':'')+decimal(value)+unit : '—';
}

export function followupLeetifyStats(pairs, matches) {
  return metrics.filter(([key]) => followupFields.has(key)).map(([key,label,format]) => ({
    label,
    format:leetifyFormat(key, format),
    changeFormat: value => Number.isFinite(value) ? changes[key](value) : '—',
    ...pairedMetric(pairs, row => leetifyFor(row,matches)?.stats[key]),
  }));
}

export function renderMapCard({rows,matches,state,metric,fmt,pct,date,esc}) {
  const byId = id => document.getElementById(id);
  const summary = summarize(rows);
  byId('mapCardFaceit').innerHTML = [
    ['Winrate',pct(summary.winrate),`${summary.decided} maps med resultat`],
    ['ADR',fmt(summary.adr),`${summary.adrCoverage} maps med ADR`],
    ['K/D',fmt(summary.kd,2),`${summary.combatCount} maps med kills/deaths`],
    ['Opening-dueller vundet',pct(summary.entry.value),`${summary.entry.count} maps med opening-data`],
  ].map(([label,value,note]) => metric(label,value,note)).join('');

  const covered = rows.flatMap(row => {
    const match = leetifyFor(row,matches);
    return match ? [{row,match}] : [];
  });
  byId('mapCardCoverage').textContent = state === 'loading' ? 'Henter Leetify-data…' :
    state === 'error' ? 'Leetify-data kunne ikke hentes.' :
    `Leetify-data for ${covered.length} af ${rows.length} maps. Hvert gennemsnit vægter kampene lige.`;
  byId('mapCardLeetify').innerHTML = covered.length ? metrics.filter(([key]) => mapFields.has(key))
    .map(([key,label,format]) => {
      const values = covered.map(({match}) => match.stats[key]).filter(Number.isFinite);
      return metric(label,leetifyFormat(key,format)(average(values)),`${values.length} / ${rows.length} maps`);
    }).join('') : '';

  const rated = covered.filter(({match}) => Number.isFinite(match.stats.leetify_rating));
  const weakest = [...rated].sort((a,b) => a.match.stats.leetify_rating-b.match.stats.leetify_rating)[0];
  const strongest = [...rated].sort((a,b) => b.match.stats.leetify_rating-a.match.stats.leetify_rating)[0];
  const examples = weakest ? (weakest === strongest ? [weakest] : [weakest,strongest]) : [];
  byId('mapCardExamples').innerHTML = examples.length ? `
    <h3>Kampe at gense</h3>
    <div class="table-wrap"><table>
      <thead><tr><th scope="col">Kamp</th><th scope="col">Resultat</th><th scope="col">ADR</th><th scope="col">Leetify Rating</th><th scope="col">CT Rating</th><th scope="col">T Rating</th><th scope="col">Kilde</th></tr></thead>
      <tbody>${examples.map(({row,match},i) => `<tr>
        <td>${examples.length === 1 ? 'Kamp med rating' : i === 0 ? 'Laveste rating' : 'Højeste rating'}<small class="match-time">${date(row.finishedAt)}</small></td>
        <td>${row.won === true ? 'Sejr' : row.won === false ? 'Nederlag' : '—'} · ${esc(row.score)}</td>
        <td>${fmt(row.adr)}</td>
        <td><button type="button" class="leetify-rating" data-leetify-row="${esc(row.id)}">${coloredLeetifyRating(match.stats.leetify_rating)}<small>Se kampens stats</small></button></td>
        <td>${coloredLeetifyRating(match.stats.ct_leetify_rating)}</td>
        <td>${coloredLeetifyRating(match.stats.t_leetify_rating)}</td>
        <td><a class="leetify-source" href="${matchLink(match)}" target="_blank" rel="noopener">View on Leetify ↗</a></td>
      </tr>`).join('')}</tbody>
    </table></div>` : '';
}
