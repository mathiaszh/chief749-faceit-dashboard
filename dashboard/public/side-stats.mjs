import {average, pairedMetric, stat} from './analytics.mjs';
import {leetifyFor, leetifyRating, matchLink} from './leetify-stats.mjs';

const halves = ['First Half Score', 'Second Half Score'];
const sides = ['ct_leetify_rating', 't_leetify_rating'];
const sideLabels = ['CT Leetify Rating', 'T Leetify Rating'];

function roundsWon(row, key) {
  const value = stat(row, key);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

export function summarizeHalves(rows) {
  const covered = rows.filter(row => halves.every(key => roundsWon(row, key) !== null));
  const overtime = covered.map(row => roundsWon(row, 'Overtime score')).filter(Number.isFinite);
  return {
    first: average(covered.map(row => roundsWon(row, halves[0]))),
    second: average(covered.map(row => roundsWon(row, halves[1]))),
    count: covered.length,
    overtime: average(overtime),
    overtimeCount: overtime.length,
  };
}

export function halfScoreNote(row) {
  const scores = halves.map(key => roundsWon(row, key));
  if (scores.every(score => score === null)) return '';
  const overtime = roundsWon(row, 'Overtime score');
  return `<small class="match-time">Holdets runder · 1H: ${scores[0] ?? '—'} · 2H: ${scores[1] ?? '—'}${overtime > 0 ? ' · OT: ' + overtime : ''}</small>`;
}

export function reboundSideStats(pairs, matches) {
  return [
    ...halves.map((key, i) => ({
      label: `Holdets vundne runder · ${i + 1}. halvleg`,
      kind: 'rounds',
      ...pairedMetric(pairs, row => roundsWon(row, key)),
    })),
    ...sides.map((key, i) => ({
      label: sideLabels[i],
      kind: 'rating',
      ...pairedMetric(pairs, row => leetifyFor(row, matches)?.stats[key]),
    })),
  ];
}

export function reboundSideCells(previous, next, matches) {
  const before = leetifyFor(previous, matches);
  const after = leetifyFor(next, matches);
  const halfLines = halves.map((key, i) =>
    `<small>${i + 1}. halvleg: ${roundsWon(previous, key) ?? '—'} → ${roundsWon(next, key) ?? '—'}</small>`);
  const sideLines = sides.map((key, i) =>
    `<small>${i === 0 ? 'CT' : 'T'}: ${leetifyRating(before?.stats[key])} → ${leetifyRating(after?.stats[key])}</small>`);
  const sourceLinks = [before, after].map((match, i) => match
    ? `<small>${i === 0 ? 'Før' : 'Efter'} · <a class="leetify-source" href="${matchLink(match)}" target="_blank" rel="noopener">View on Leetify ↗</a></small>`
    : '');
  return `<td class="rebound-side-cell">${halfLines.join('')}</td><td class="rebound-side-cell">${sideLines.join('')}${sourceLinks.join('')}</td>`;
}
