# FACEIT Analyse

[Åbn dashboardet](https://chief749-faceit-dashboard.densedough2.chatgpt.site)

Stats og analyser for CS2: standardtal, form, stabilitet, maps, opening-dueller, clutches, utility og sessioner. Level 10 er en valgfri ekstra sektion.

Den aktuelle frontend og server ligger i [`dashboard/`](dashboard/README.md). Se denne mappe for beregninger, API-felter, begrænsninger og udvikling.

## Nuværende opsætning

Chief749s arkiv opdateres af GitHub Actions. Dashboardet kan bruge det uden en nøgle i browseren. Søgning på andre FACEIT-brugernavne er implementeret på serveren, men kræver også `FACEIT_API_KEY` i hostingens hemmelige runtime-miljø. GitHub Actions-secrets overføres ikke automatisk til hosting.

Dashboardet er fortsat privat. En søgefunktion ændrer ikke adgangsindstillingerne.

## Automatisk arkiv — kun browser nødvendig

1. Gem server-side nøglen som `FACEIT_API_KEY` under [Actions secrets](https://github.com/mathiaszh/chief749-faceit-dashboard/settings/secrets/actions).
2. Start [Update FACEIT data](https://github.com/mathiaszh/chief749-faceit-dashboard/actions/workflows/sync.yml) med **Run workflow**, hvis du ønsker en import nu.
3. Åbn dashboardet, og vælg **Opdater**.

Workflowet er planlagt hvert 15. minut. GitHub kan forsinke kørsler og deaktivere planlagte workflows efter inaktivitet. `scripts/sync.py` importerer først op til 100 afsluttede kampe, derefter nye kampe og forsinkede detaljer. Offentlige kampdata gemmes i `web/data/faceit.json`. API-nøglen gemmes aldrig i datafilen.

`web/` indeholder også den tidligere statiske prototype; den aktive version er `dashboard/`.

## Verifikation

- `node --test dashboard/tests/*.test.mjs`: aggregation, manglende felter, sessioner, API-normalisering, brugeropslag og fejl.
- `python -m unittest discover -s tests`: arkivimport.
- I `dashboard/`: `npm run install:ci`, `npx tsc --noEmit`, `npm run build`.

### Experimental ratings (v1)

The match history includes HaldLab rating (0–2) and a personal percentile (0–100).
`dashboard/public/ratings.mjs` defines both formulas; missing required inputs produce no rating.
The fixed reference in `dashboard/public/data/rating-reference-v1.json` contains population
means and standard deviations from 1,000 complete player-map observations, 699 distinct
players, across Chief749's 100 loaded matches. This convenience sample is not representative
of all FACEIT players. Model weights are proposed, not fitted or validated as win impact.
Historical scores use this retrospective fixed reference, not a prediction-time baseline.
Reference metadata includes source match IDs and creation time. No ELO adjustment is applied.

The personal percentile requires 20 prior complete maps, uses the same map when possible,
and otherwise uses all maps. Current match, equal timestamps, future matches and duplicates
are excluded. Filters do not change the underlying loaded history. Up to 100 maps are loaded,
so the oldest matches lack enough earlier history. Ties count half. All models are descriptive;
these are not FACEIT Rating or Swing. A personal percentile cannot rank different players.

To reproduce a new reference version manually, save a `/api/player` response and run
`python dashboard/scripts/calibrate-rating.py player.json new-reference.json`.
Do not silently overwrite the published v1 baseline; publish and label a new version.
Run tests with `node --test dashboard/tests/*.test.mjs`.
