"""Fetch public CS2 statistics. The API key is read only from the environment."""
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "web/data/faceit.json"


def fetch(path, key, **query):
    url = "https://open.faceit.com/data/v4/" + path
    if query:
        url += "?" + urlencode(query)
    for attempt in range(4):
        try:
            request = Request(url, headers={"Authorization": "Bearer " + key})
            with urlopen(request, timeout=30) as response:
                return json.load(response)
        except HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 3:
                raise RuntimeError(f"FACEIT returned HTTP {error.code}.") from None
        except (URLError, TimeoutError):
            if attempt == 3:
                raise RuntimeError("FACEIT could not be reached.") from None
        time.sleep(2 ** (attempt + 1))


def number(value):
    try:
        result = float(str(value).rstrip("%"))
        return result if result == result and abs(result) != float("inf") else None
    except (ValueError, TypeError):
        return None


def normalize(match, payload, player_id):
    # Some competitions contain multiple maps. Keep only this player's rows.
    rows = []
    for index, round_data in enumerate(payload.get("rounds", [])):
        for team in round_data.get("teams", []):
            for player in team.get("players", []):
                if player.get("player_id") != player_id:
                    continue
                stats = player.get("player_stats", {})
                round_stats = round_data.get("round_stats", {})
                result = number(stats.get("Result"))
                winner = round_stats.get("Winner") or match.get("results", {}).get("winner")
                won = result == 1 if result in (0, 1) else (team.get("team_id") == winner if winner else None)
                rows.append({
                    "id": f"{match['match_id']}:{index}", "matchId": match["match_id"],
                    "finishedAt": match.get("finished_at"),
                    "map": round_stats.get("Map", "Ukendt map").removeprefix("de_"),
                    "won": won, "score": round_stats.get("Score"),
                    "kills": number(stats.get("Kills")), "deaths": number(stats.get("Deaths")),
                    "assists": number(stats.get("Assists")), "adr": number(stats.get("ADR")),
                    "headshots": number(stats.get("Headshots %")),
                    "rounds": number(round_stats.get("Rounds")),
                    # Preserve the official fields so availability can be audited.
                    "sourcePlayerStats": stats, "sourceRoundStats": round_stats,
                })
    return rows


def main():
    key = os.environ.get("FACEIT_API_KEY", "").strip()
    if not key:
        raise SystemExit("Add FACEIT_API_KEY under Settings > Secrets and variables > Actions.")
    old = json.loads(DESTINATION.read_text()) if DESTINATION.exists() else {}
    profile = fetch("players", key, nickname="Chief749", game="cs2")
    player_id = profile["player_id"]
    previous = {row["id"]: row for row in old.get("matches", [])}
    complete = {row["matchId"] for row in previous.values()}
    now = int(time.time())
    # Import the latest 100 on first use; subsequent runs catch up since last sync.
    lower = max(0, int(old.get("lastSyncEpoch", 0)) - 86400)
    pending = dict(old.get("pending", {}))
    for offset in range(0, 1001, 100):
        history = fetch(f"players/{player_id}/history", key, game="cs2", limit=100,
                        offset=offset, **{"from": lower, "to": now})
        items = history.get("items", [])
        for match in items:
            if match.get("status") == "FINISHED" and match["match_id"] not in complete:
                pending[match["match_id"]] = match
        if not old.get("lastSyncEpoch") or len(items) < 100:
            break
        if offset == 1000:
            raise RuntimeError("Catch-up exceeds 1,100 matches. Date-window backfill is required.")
    for match_id, match in list(pending.items()):
        try:
            payload = fetch(f"matches/{match_id}/stats", key)
        except RuntimeError as error:
            if "HTTP 404" in str(error):
                continue  # Stats can be delayed; retry on the next scheduled run.
            raise
        rows = normalize(match, payload, player_id)
        if rows:
            previous.update({row["id"]: row for row in rows})
            del pending[match_id]
        time.sleep(0.15)
    game = profile.get("games", {}).get("cs2", {})
    snapshots = old.get("eloSnapshots", [])
    elo = number(game.get("faceit_elo"))
    timestamp = datetime.now(timezone.utc).isoformat()
    if elo is not None and (not snapshots or snapshots[-1]["elo"] != elo):
        snapshots.append({"at": timestamp, "elo": elo})
    data = {
        "nickname": profile["nickname"], "elo": elo, "level": game.get("skill_level"),
        "updatedAt": timestamp, "lastSyncEpoch": now,
        "matches": sorted(previous.values(), key=lambda row: row.get("finishedAt") or 0, reverse=True),
        "eloSnapshots": snapshots, "pending": pending,
    }
    DESTINATION.parent.mkdir(parents=True, exist_ok=True)
    temporary = DESTINATION.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    temporary.replace(DESTINATION)
    print(f"Saved {len(previous)} map results. Pending matches: {len(pending)}.")


if __name__ == "__main__":
    main()
