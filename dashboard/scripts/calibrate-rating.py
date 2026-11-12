"""Manual, versioned calibration from a saved player response and public match API.
Usage: python calibrate-rating.py player.json output.json
Never runs on page loads or automatically updates an existing model version.
"""
import concurrent.futures, datetime, json, math, statistics, sys, urllib.request
from pathlib import Path
player=json.loads(Path(sys.argv[1]).read_text())
ids=list(dict.fromkeys(r['matchId'] for r in player['matches']))[:100]
cache=Path('/tmp/haldlab-calibration');cache.mkdir(exist_ok=True)
def fetch(mid):
 p=cache/(mid+'.json')
 if p.exists():return mid,json.loads(p.read_text())
 try:
  with urllib.request.urlopen('https://cs2.haldlab.com/api/match?id='+mid,timeout=40) as r:d=json.load(r)
  p.write_text(json.dumps(d));return mid,d
 except Exception as e:print('Skipped',mid,type(e).__name__,flush=True);return mid,None
samples=[];used=[];unique=set();seen=set();excluded=0
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for i,(mid,d) in enumerate(pool.map(fetch,ids)):
  if not d:continue
  used.append(mid)
  for ri,rd in enumerate(d.get('rounds',[])):
   for t in rd.get('teams',[]):
    for p in t.get('players',[]):
     key=(mid,ri,p['player_id'])
     if key in seen:continue
     seen.add(key)
     try:
      s=p['player_stats'];rounds=float(rd['round_stats']['Rounds'])
      a,k,de,ec,ew,f=[float(s[n]) for n in ['ADR','Kills','Deaths','Entry Count','Entry Wins','Enemies Flashed']]
      if rounds<=0 or min(a,k,de,ec,ew,f)<0 or ew>ec or not all(math.isfinite(v) for v in [rounds,a,k,de,ec,ew,f]):raise ValueError()
      samples.append(dict(adr=a,kpr=k/rounds,dpr=de/rounds,od=(2*ew-ec)/rounds,fpr=f/rounds));unique.add(p['player_id'])
     except (ValueError,TypeError,KeyError):excluded+=1
  if (i+1)%10==0:print('Fetched',i+1,'/',len(ids),flush=True)
if len(samples)<200:raise SystemExit('Insufficient complete player-maps; do not publish.')
metrics={key:{'mean':statistics.mean(s[key] for s in samples),'sd':statistics.pstdev(s[key] for s in samples)} for key in samples[0]}
assert all(v['sd']>0 for v in metrics.values())
out={'version':'experimental-v1','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':'All available players in Chief749 latest 100 loaded CS2 matches; convenience sample, not representative of all FACEIT players.','playerMaps':len(samples),'uniquePlayers':len(unique),'excludedPlayerMaps':excluded,'matchCount':len(used),'requestedMatchCount':len(ids),'matchIds':used,'metrics':metrics}
Path(sys.argv[2]).write_text(json.dumps(out,indent=2)+'\n');print('Calibration:',len(samples),'player maps,',len(unique),'players;',metrics,flush=True)
