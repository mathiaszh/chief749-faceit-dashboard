# FACEIT Analyse

CS2-statistik og analyser for en valgt FACEIT-spiller. Standardstats er centrum; Elo og level 10 er en valgfri, sammenfoldet sektion.

## Funktioner

- Kills, deaths, assists, K/D, ADR, headshot-andel, kills pr. runde og multikill-runder.
- Filtre for periode, antal maps, map og resultat.
- Formkurve med runde-vægtet glidende gennemsnit og sammenligning af to lige store perioder.
- Stabilitet: median og den midterste halvdel af ADR-resultaterne.
- Map-pool med antal kampe og Wilson 95 %-intervaller for winrate.
- Opening-dueller, 1v1/1v2-clutches, utility damage og flash-forbrug med synlig datadækning.
- Sessionsanalyse og resultatet i kampen efter sejr/nederlag. Beskriver sammenhænge, ikke årsager.
- Kamphistorik med links til FACEIT.

## Datakilder og status

`GET /api/player?nickname=...` slår en vilkårlig CS2-spiller op med en server-side nøgle. Profil og op til 100 seneste mapresultater hentes først. `GET /api/match?id=...` supplerer detaljer progressivt med højst tre samtidige opslag fra klienten. Profilopslag caches i fem minutter, kampdetaljer i en time.

Den officielle batch-statistik blev afprøvet mod Chief749s konto: standardstats findes i batch-svaret, mens opening, clutch, flash og utility kræver kampdetalje-endpointet. De 100 importerede maps havde de anvendte avancerede felter. Andre kampe kan mangle dem. Der opfindes ikke Rating, Swing, trades, KAST, positioner eller aim-målinger.

`FACEIT_API_KEY` skal findes i hostingens hemmelige runtime-miljø for live søgning. Den må aldrig ligge i frontend, commits, URL'er eller offentlige JSON-filer. GitHub Actions-nøglen aktiverer kun arkivimporten; den er ikke automatisk tilgængelig på hostingserveren.

Chief749 virker også uden hostingnøglen via det automatiske offentlige GitHub-arkiv. Hvis serveren ikke kan hente arkivet, prøver browseren det offentlige arkiv direkte. En dateret kopi i `public/data/faceit.json` er sidste reserve. Visningen mærker denne reserve med, at live-opdatering er utilgængelig, og viser dataenes oprindelige tidspunkt.

## Beregninger og begrænsninger

K/D bruger samlede kills/deaths; ADR vægtes efter runder. Procenter for headshots, entry og clutch bruger summerede tællere og nævnere. Manglende data er `null` og vises som `—`; nul forsøg giver ingen procent. En serie kan indeholde flere maps, som tælles særskilt. Perioden filtreres før map/resultat og før grænsen for antal maps.

Sessioner afgrænses ved over 90 minutter mellem sluttidspunkter. Positionen beregnes i hele den indlæste historik før filtrering. Første session kan være afskåret. Winrate-intervaller forudsætter en binomialmodel og tager ikke højde for skiftende modstandere eller afhængighed mellem kampe. Formanalyser korrigerer ikke for rolle, lobby eller holdkammerater.

## Udvikling

Node.js 22.13 eller nyere. Installer med `npm run install:ci`, start med `npm run dev`, byg med `npm run build`.

Tests: `node --test tests/*.test.mjs`. Typekontrol: `npx tsc --noEmit`.

`app/api/` indeholder server-endpoints, `lib/faceit.mjs` API-normalisering, `public/analytics.mjs` beregninger og `public/dashboard.*` brugerfladen. Worker og Sites-buildintegration følger den medfølgende Vinext-skabelon. `.openai/hosting.json` identificerer den eksisterende private deployment.
