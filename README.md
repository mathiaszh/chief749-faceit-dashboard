# chief749-faceit-dashboard
Personal CS2 dashboard for Chief749, using the official FACEIT Data API.

## Opsætning i browseren

1. Åbn [Actions secrets](https://github.com/mathiaszh/chief749-faceit-dashboard/settings/secrets/actions).
2. Vælg **New repository secret**. Brug navnet `FACEIT_API_KEY`, og indsæt din nye server-side FACEIT-nøgle i værdifeltet.
3. Åbn [Update FACEIT data](https://github.com/mathiaszh/chief749-faceit-dashboard/actions/workflows/sync.yml), og vælg **Run workflow** på `main`.
4. Efter en grøn kørsel kan dashboardet indlæse tallene. Knappen **Opdater visning** genindlæser de gemte data.

Workflowet er planlagt hvert 15. minut og kører også med browseren lukket. GitHub kan forsinke planlagte kørsler og deaktivere dem efter 60 dages inaktivitet i offentlige repositories. Genaktivér i Actions om nødvendigt.

Repoet er offentligt. De hentede offentlige FACEIT-statistikker gemmes i `web/data/faceit.json`. API-nøglen tilgås kun via GitHub Actions secrets og sendes til FACEIT i en Authorization-header.

## Analyse og datagrundlag

- Første hentning importerer de seneste op til 100 afsluttede CS2-kampe. Fremtidige kørsler tilføjer nye kampe og genforsøger kampe med forsinket statistik.
- Kampe med flere maps vises som flere rækker. Filtre tæller maps. Prognosen anvender kun entydige enkeltmap-kampe.
- K/D beregnes som samlede kills divideret med samlede deaths. ADR vægtes efter antal runder for rækker, hvor begge felter findes. Manglende statistik vises som en streg.
- Elo-grafen viser aktuelle profilværdier indsamlet fra første synkronisering. Ændringer mellem målinger kan dække flere kampe eller korrektioner. Historisk Elo pr. kamp rekonstrueres ikke.
- Level 10-scenariet kræver mindst 10 kampe inden for 30 dage. Det antager +25 Elo ved sejr og −25 ved nederlag, en uændret winrate og samme antal kampe pr. 30 dage. Ved winrate på højst 50 % vises ingen forventet dato. Scenariet er usikkert og tager ikke højde for lobbyernes sværhedsgrad.
- FACEIT Rating og Swing vises først, hvis officiel adgang til de konkrete felter kan verificeres.
- De konkrete API-felter skal valideres ved den første kørsel med din nøgle. Der anvendes ingen demo-tal som live-statistik.

## Kode og hosting

`web/` er den statiske hjemmeside. Den henter den seneste JSON fra dette repo. `scripts/sync.py` kræver Python 3.12 og standardbiblioteket. Dashboardet kan hostes som en statisk hjemmeside med `web/` som rod.

Automatiske tests kan køres med `python -m unittest discover -s tests` og `node --test tests/analytics.test.mjs`. De kræver ingen API-nøgle.
