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
