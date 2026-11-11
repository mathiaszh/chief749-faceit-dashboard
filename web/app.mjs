import {summarize, forecast} from './analytics.mjs';

const source = 'https://raw.githubusercontent.com/mathiaszh/chief749-faceit-dashboard/main/web/data/faceit.json';
const element = id => document.getElementById(id);
const format = (value, digits = 1) => Number.isFinite(value) ? value.toLocaleString('da-DK', {maximumFractionDigits:digits, minimumFractionDigits:digits}) : '—';
const percent = value => Number.isFinite(value) ? format(value * 100, 0) + ' %' : '—';
const date = value => new Date(value).toLocaleDateString('da-DK', {day:'numeric', month:'short', timeZone:'Europe/Copenhagen'});
let data = {matches:[], eloSnapshots:[]};

function text(id, value) { element(id).textContent = value; }
function selectedRows() {
  const limit = element('period').value;
  const rows = limit === 'all' ? data.matches : data.matches.slice(0, Number(limit));
  const map = element('map').value;
  return map === 'all' ? rows : rows.filter(row => row.map === map);
}
function cell(row, value, className = '') {
  const td = document.createElement('td');
  td.textContent = value;
  td.className = className;
  row.append(td);
  return td;
}
function render() {
  const rows = selectedRows();
  const summary = summarize(rows);
  text('elo', format(data.elo, 0));
  text('level', data.level ?? '—');
  text('distance', Number.isFinite(data.elo) ? `${Math.max(0, 2001 - data.elo)} Elo til level 10` : 'Mål · 2.001 Elo');
  text('winrate', percent(summary.winrate));
  text('record', `${summary.wins} sejre · ${summary.count} maps`);
  text('kd', format(summary.kd, 2));
  text('adr', format(summary.adr));
  text('coverage', `ADR tilgængelig for ${summary.adrCoverage}/${summary.count} maps`);
  element('setup').hidden = Boolean(data.updatedAt);
  element('progress').style.width = `${Number.isFinite(data.elo) ? Math.max(0, Math.min(100, (data.elo - 1751) / 250 * 100)) : 0}%`;
  const prediction = forecast(data.matches, data.elo);
  let title = 'Næste stop, level 10';
  let description = 'Prognosen kræver mindst 10 enkeltmap-kampe inden for de seneste 30 dage.';
  if (prediction?.reached) {
    title = 'Level 10 er nået'; description = 'Du har passeret grænsen på 2.001 Elo.';
  } else if (prediction && !prediction.insufficient) {
    title = prediction.games ? `Ca. ${prediction.games} kampe tilbage` : 'Afventer positiv udvikling';
    description = prediction.days ? `Omkring ${date(Date.now() + prediction.days * 86400000)} ved ${percent(prediction.winrate)} winrate og ${prediction.count} kampe pr. 30 dage.` : `Din winrate på ${percent(prediction.winrate)} giver ingen positiv forventet Elo-tilvækst i dette scenarie.`;
  }
  text('forecastTitle', title); text('forecastText', description);
  const maps = element('maps'); maps.replaceChildren();
  for (const map of [...new Set(rows.map(row => row.map))]) {
    const stats = summarize(rows.filter(row => row.map === map));
    const card = document.createElement('article'); card.className = 'map-card';
    const heading = document.createElement('h3'); heading.textContent = map;
    const rate = document.createElement('strong'); rate.textContent = percent(stats.winrate);
    const detail = document.createElement('p'); detail.textContent = `${stats.wins} sejre / ${stats.count} maps · K/D ${format(stats.kd, 2)} · ADR ${format(stats.adr)}`;
    const sample = document.createElement('small'); sample.textContent = stats.count < 5 ? 'Lille datagrundlag' : 'Winrate i valgt udsnit';
    card.append(heading, rate, detail, sample); maps.append(card);
  }
  if (!rows.length) {const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'Map-analysen vises, når kampdata er hentet.'; maps.append(empty);}
  const body = element('matches'); body.replaceChildren();
  for (const match of rows) {
    const row = document.createElement('tr');
    cell(row, match.finishedAt ? date(match.finishedAt * 1000) : '—');
    cell(row, match.map);
    cell(row, match.won === true ? 'Sejr' : match.won === false ? 'Nederlag' : '—', match.won === true ? 'win' : match.won === false ? 'loss' : '');
    cell(row, match.score ?? '—');
    cell(row, [match.kills,match.deaths,match.assists].map(n => format(n,0)).join(' / '));
    cell(row, format(match.adr)); cell(row, format(match.headshots,0));
    const link = document.createElement('a'); link.href = `https://www.faceit.com/en/cs2/room/${encodeURIComponent(match.matchId)}`; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Åbn ↗'; cell(row, '').append(link); body.append(row);
  }
  text('matchCount', `${rows.length} maps`);
  drawChart();
}
function drawChart() {
  const canvas = element('chart');
  const width = canvas.clientWidth;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = width * ratio; canvas.height = 230 * ratio;
  const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio);
  const points = data.eloSnapshots.filter(p => Number.isFinite(p.elo) && Number.isFinite(Date.parse(p.at)));
  if (!points.length) {ctx.fillStyle='#9aa3b2';ctx.font='13px Inter, sans-serif';ctx.fillText('Afventer første Elo-måling',25,110);return;}
  const min = Math.min(...points.map(p=>p.elo),2001)-30;
  const max = Math.max(...points.map(p=>p.elo),2001)+30;
  const start = Date.parse(points[0].at); const end = Math.max(start + 1, Date.parse(points.at(-1).at));
  const x = p => 45 + (Date.parse(p.at)-start)/(end-start)*(width-65);
  const y = elo => 195-(elo-min)/(max-min)*165;
  ctx.font='11px Inter, sans-serif';
  for(const value of [min,2001,max]){ctx.strokeStyle='#303641';ctx.beginPath();ctx.moveTo(44,y(value));ctx.lineTo(width-15,y(value));ctx.stroke();ctx.fillStyle='#9aa3b2';ctx.fillText(Math.round(value),0,y(value)+4);}
  ctx.strokeStyle='#ff642b';ctx.lineWidth=2;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(x(p),y(p.elo)):ctx.moveTo(x(p),y(p.elo)));ctx.stroke();
  for(const p of points){ctx.fillStyle='#ff642b';ctx.beginPath();ctx.arc(x(p),y(p.elo),3,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#9aa3b2';ctx.fillText(date(points[0].at),45,222);if(points.length>1)ctx.fillText(date(points.at(-1).at),width-70,222);
  text('chartNote', `${points.length} målinger · ${points.at(-1).elo} Elo ved seneste ændring. Flere kampe kan ligge mellem to målinger.`);
}
async function load() {
  element('refresh').disabled=true;
  try {
    const response = await fetch(source + '?t=' + Math.floor(Date.now()/60000), {cache:'no-store', signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Data kunne ikke hentes fra GitHub.');
    const next = await response.json();
    if (!Array.isArray(next.matches) || !Array.isArray(next.eloSnapshots)) throw new Error('Dataformatet kunne ikke læses.');
    data = next;
    const selected = element('map').value;
    element('map').replaceChildren(new Option('Alle maps','all'));
    for(const map of [...new Set(data.matches.map(row=>row.map))].sort())element('map').add(new Option(map,map));
    element('map').value = [...element('map').options].some(o=>o.value===selected) ? selected : 'all';
    const age = Date.now() - Date.parse(data.updatedAt);
    text('status', data.updatedAt ? `Senest hentet ${new Date(data.updatedAt).toLocaleString('da-DK', {timeZone:'Europe/Copenhagen'})}${age>3600000?' · Data er over en time gamle. Tjek datahentningen i GitHub.':''}` : 'Klar til at modtage dine første FACEIT-data.');
    render();
  } catch(error) {text('status', error.message + ' Prøv Opdater visning igen.');render();}
  finally {element('refresh').disabled=false;}
}
element('refresh').addEventListener('click',load);
element('period').addEventListener('change',render);
element('map').addEventListener('change',render);
window.addEventListener('resize',drawChart);
setInterval(load,300000);
load();
