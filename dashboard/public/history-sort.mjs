import {killsPerRound,stat} from './analytics.mjs';
export const historyColumns={date:'Dato',map:'Map',result:'Resultat',score:'Score',kills:'Kills',deaths:'Deaths',assists:'Assists',kd:'K/D',kpr:'Kills / runde',adr:'ADR',rating:'HaldLab',personal:'Personlig',leetifyRating:'Leetify Rating',hs:'HS %',opening:'Opening',utility:'Utility-skade'};
export const defaultDirection=key=>['map','result'].includes(key)?'asc':'desc';
function value(row,key,ratings){
 switch(key){
 case 'date':return row.finishedAt||null;
 case 'map':return row.map||null;
 case 'result':return row.won===true?'Sejr':row.won===false?'Tabt':null;
 case 'score':{const parts=String(row.score??'').match(/^\s*(\d+)\s*[/:-]\s*(\d+)\s*$/);return parts?[Number(parts[1]),Number(parts[2])]:null;}
 case 'kd':return Number.isFinite(row.kills)&&row.deaths>0?row.kills/row.deaths:null;
 case 'kpr':return killsPerRound(row);
 case 'rating':return ratings.get(row.id)?.score??null;
 case 'personal':return ratings.get(row.id)?.personal??null;
 case 'hs':return row.headshots;
 case 'opening':{const wins=stat(row,'Entry Wins'),attempts=stat(row,'Entry Count');return wins===null||attempts===null?null:[wins,attempts];}
 case 'utility':return stat(row,'Utility Damage');
 default:return row[key];
 }
}
const missing=v=>v===null||v===undefined||(typeof v==='number'&&!Number.isFinite(v));
function compare(a,b){if(Array.isArray(a))return compare(a[0],b[0])||compare(a[1],b[1]);return typeof a==='string'?a.localeCompare(b,'da',{numeric:true,sensitivity:'base'}):a-b;}
export function sortHistory(rows,key='date',direction='desc',ratings=new Map()){
 if(!Object.hasOwn(historyColumns,key))key='date';
 return [...rows].sort((a,b)=>{const av=value(a,key,ratings),bv=value(b,key,ratings);if(missing(av)||missing(bv)){if(missing(av)!==missing(bv))return missing(av)?1:-1;}else{const diff=compare(av,bv)*(direction==='asc'?1:-1);if(diff)return diff;}return (b.finishedAt||0)-(a.finishedAt||0)||String(a.id).localeCompare(String(b.id));});
}
