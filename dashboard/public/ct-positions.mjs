// Common CT holds and callouts for the standard and historical FACEIT maps.
export const ctPositions = {
  nuke: [
    ['Ramp', 'Aftal hvem der dækker Lower, når du falder fra Ramp. Gem en granat til at dække faldet, hvis makkeren tager første kontakt.'],
    ['Outside|Garage|Secret|Red|Mini|Heaven', 'Aftal hvem der holder overgangen til Secret. Meld tidligt, hvis du mister synet på de spillere, der krydser Outside.'],
    ['A-site|Hut|Squeaky|Rafters|Mustang|Top Hut|Vent', 'Fordel Hut og Squeaky med din makker før runden, så I kan dække én indgang hver.'],
    ['B-site|Decon|Double Doors|Dark|Toxic|Control|Single Door', 'Aftal hvem der ser Decon og Double Doors, så Ramp-spilleren kan falde tilbage uden at efterlade en åben indgang.'],
    ['Rotator|Hell|CT Spawn', 'Vent på en tydelig melding fra Ramp eller Outside, og aftal hvem der overtager din vinkel, før du roterer.'],
  ],
  mirage: [
    ['A-site|Ticket|Triple|Default|Firebox|Ninja|Under Palace|Balcony|Sandwich|Stairs|Tetris|A Ramp', 'Fordel A Ramp og Palace med din makker. Sig hvilken indgang du har, før den første kontakt.'],
    ['Mid|Window|Connector|Jungle|Underpass|Top Mid|Chair|Ladder Room|Short|Catwalk', 'Aftal hvem der ser Top Mid og hvem der dækker Underpass. Meld straks hvis en smoke giver plads til et kryds.'],
    ['B-site|Van|Bench|Market|Market Window|Market Door|B Apps|Get Right|Arches', 'Aftal hvilken vinkel du falder til ved pres fra Apps, og hvem der holder Short imens.'],
    ['Rotator|CT Spawn', 'Bed om antal og retning før du flytter, så I ved hvem der bliver på det tomme site.'],
  ],
  inferno: [
    ['Banana|Car|Sandbags|Half Wall|Logs|B Ramp', 'Fordel den første og anden granat på Banana, og aftal hvornår I giver pladsen tilbage.'],
    ['B-site|Coffins|New Box|First Oranges|Second Oranges|Dark|Fountain|Construction|CT', 'Aftal hvem der ser indgangen til B, og hvem der spiller til trade fra site eller Construction.'],
    ['A-site|Pit|Mini Pit|Graveyard|Balcony|Apps|Boiler|Short|Default|Triple|Quad|Cemetery', 'Fordel Apps og Short, så begge indgange er dækket når den første spiller tager kontakt.'],
    ['Mid|Long|Arch|Library|Moto|Top Mid|Porch|Rotator|CT Spawn', 'Aftal hvem der holder åbningen mod Long, før du roterer væk fra A.'],
  ],
  dust2: [
    ['Long|Long Doors|Pit|Blue|Car|A Ramp|Cross', 'Aftal hvem der tager første kontakt på Long og hvem der dækker dit fald mod A.'],
    ['A-site|Goose|Default|Short|Catwalk|Elevator|Ninja', 'Fordel Long og Short før runden. Meld hvilken indgang forsvaret har mistet, før du skifter vinkel.'],
    ['Mid|Mid Doors|Xbox|Lower Tunnels|CT Mid|CT Spawn|Rotator', 'Hold aftalen om hvem der ser Mid Doors. Meld tidligt hvis et kryds truer B fra to sider.'],
    ['B-site|B Doors|B Window|Back Plat|Big Box|B Car|Closet|Upper Tunnels', 'Lad én tage kontakt ved Tunnels og én spille til trade fra site, Window eller Doors.'],
  ],
  ancient: [
    ['A-site|A Main|Temple|Donut|Default|Triple|Big Box|Back Site', 'Fordel A Main og Donut. Meld hvis I mister en indgang, før makkeren skifter vinkel.'],
    ['Mid|Red Room|Top Mid|Elbow|Cubby|House|Rotator|CT Spawn', 'Aftal hvem der holder Elbow mens du tager kontakt, og meld når I mister forbindelsen til Donut.'],
    ['B-site|B Ramp|Cave|Pillar|Short|Long|Back Site B|Default B|Lane', 'Fordel presset fra Ramp og Cave, og aftal hvor du falder hen for at kunne trades.'],
  ],
  anubis: [
    ['A-site|A Main|Heaven|Hell|Fountain|Default|Pillar|Back Site|A Connector', 'Fordel A Main og forbindelsen mod Mid. Meld tidligt hvis du mister kontakten til din makker.'],
    ['Mid|Mid Doors|Bridge|Water|Canal|Connector|Palace|Rotator|CT Spawn', 'Aftal hvem der følger spillere fra Water, før du lader Mid stå for at hjælpe et site.'],
    ['B-site|B Main|B Long|Ruins|Pillar B|Default B|Back Site B|Ninja|Dark|B Connector', 'Fordel B Main og Connector. Meld hvis du tvinges til at forlade din vinkel, så makkeren kan falde med.'],
  ],
  cache: [
    ['A-site|Quad|Default|Forklift|A Main|Squeaky|NBK|Truck|Highway', 'Fordel A Main og Squeaky, og aftal hvem der overtager hvis spilleren ved Forklift falder tilbage.'],
    ['Mid|Z Connector|White Box|Sandbags|Boost|Garage|Vent|Rotator|CT Spawn', 'Aftal hvem der ser Boost og hvem der følger en spiller gennem Vent. Meld så snart Mid er tabt.'],
    ['B-site|B Main|Checkers|Heaven|Headshot|Default B|Back Site|Tree|CT Hall', 'Fordel B Main og Checkers. Spil fra to vinkler hvor én kan reagere, når den anden melder kontakt.'],
  ],
  overpass: [
    ['A-site|Bank|Dumpster|Truck|Default|Long|Toilets|Party|Fountain|Playground|A Short', 'Fordel Long og Toilets. Aftal hvornår I falder til Bank og Dumpster, hvis de får plads foran A.'],
    ['Connector|Stairs|Rotator|CT Spawn', 'Vent på en melding om retning og antal, og aftal hvem der ser Connector, før du roterer.'],
    ['B-site|Monster|Short B|Water|Sandbags|Pillar|Barrels|Graffiti|Heaven|Toxic|Sewers', 'Fordel Monster og Short. Aftal hvem der bruger første granat og hvor site-spilleren falder ved kontakt.'],
  ],
  train: [
    ['A-site|A Main|Ivy|Popdog|Hell|A Connector|Green Train|Red Train|E-box|Sandwich|Bomb Train|Z', 'Fordel kontakten fra A Main og Ivy, og meld når den ene vinkel står åben.'],
    ['B-site|Upper B|Lower B|B Ramp|Oil Train|Back Site|B Connector|Stop Sign', 'Fordel Upper og Lower, og aftal hvor den første spiller kan falde, mens makkeren dækker.'],
    ['Rotator|CT Spawn', 'Aftal hvem der overtager forbindelsen mod A, hvis du går mod B på en tidlig melding.'],
  ],
  vertigo: [
    ['A-site|A Ramp|Elevator|Sandbags|Scaffolding|Short A|Default|Headshot|Gap|Boost', 'Fordel den første granat på Ramp og aftal, hvornår I falder fra Ramp til Site sammen.'],
    ['Mid|Mid Doors|Top Mid|Ladder|Connector|Rotator|CT Spawn', 'Meld når Mid er åbent før du roterer, og aftal hvem der beskytter forbindelsen til B.'],
    ['B-site|B Stairs|B Ramp|Generator|Default B|Back Site|B Platform|Catwalk', 'Fordel trappen og forbindelsen fra Mid, så den der falder fra trappen kan blive tradet.'],
  ],
};

export const mapKey = map => String(map).toLowerCase().replace(/^de_/, '').replace(/[^a-z0-9]/g, '');
