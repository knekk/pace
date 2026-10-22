# ⏱️ Pace

Pace-kalkulator for løpere: **min/km ↔ km/t ↔ sluttid**.

**👉 Bruk den her: <https://knekk.github.io/pace/>**

- Scroll minutter og sekunder på **pace** (f.eks. `4:00 min/km`) og se farten (`15,0 km/t`).
- Scroll på **fart** og se pacen – begge veier er koblet sammen.
- Velg en distanse og scroll en **sluttid** (f.eks. 10 km på `45:00`) for å få pacen (`4:30 min/km`).
- Tider for **400 m, 800 m, 1 km, 1500 m, engelsk mil, 2 km, 3 km, 5 km, 10 km, halvmaraton
  og maraton** på den gjeldende pacen. Trykk på en distanse for å velge den i sluttid-kortet.
- **Egen distanse** (f.eks. en stafett-etappe): trykk «+ Egen», skriv inn tallet i m, km
  eller mi og trykk OK.
- Kan legges til på Hjem-skjermen på mobil og brukes som en app.
- Liten **km | mi**-bryter (km er standard) for `min/mile` og `mph`.
- **NO | EN** for norsk (standard) eller engelsk.

Fungerer på mobil, nettbrett og PC. Hjulene kan også styres med tastatur
(↑/↓, PageUp/PageDown, Home/End).

## URL-parametre

Adressen oppdateres automatisk mens du bruker siden, så du kan dele eller bokmerke den.

| Parameter | Eksempel        | Beskrivelse                                              |
|-----------|-----------------|----------------------------------------------------------|
| `lang`    | `?lang=en`      | `nb` (standard) eller `en`                               |
| `unit`    | `?unit=mi`      | `km` (standard) eller `mi`                               |
| `pace`    | `?pace=4:30`    | pace i valgt enhet                                       |
| `speed`   | `?speed=15`     | fart i valgt enhet (brukes hvis `pace` mangler)          |
| `dist`    | `?dist=10k`     | valgt distanse: `400 800 1k 1500 mi 2k 3k 5k 10k hm m custom` |
| `m`       | `?m=6300`       | egen distanse i meter (brukes når `dist=custom`)         |
| `time`    | `?time=45:00`   | sluttid på `dist` – setter pacen (vinner over `pace`)    |

Eksempler:

- `https://knekk.github.io/pace/?pace=4:00`
- `https://knekk.github.io/pace/?dist=hm&time=1:30:00`
- `https://knekk.github.io/pace/?lang=en&unit=mi&speed=7.5`
- `https://knekk.github.io/pace/?dist=custom&m=6300&time=25:12`

## Teknisk

- Ren HTML, CSS og JavaScript (ES-moduler). Ingen byggeverktøy, ingen avhengigheter.
- Hjulene er vanlige rullbare lister med CSS `scroll-snap`, så de fungerer med touch,
  musehjul, styreflate og tastatur.
- Én kanonisk verdi – **sekunder per kilometer** – alt annet regnes ut fra den.
  Sluttid-kortet setter pacen eksakt (ikke avrundet), så tabellen stemmer alltid.
- Siste verdier lagres i `localStorage` og i adressefeltet.

```
pace/
├── index.html
├── css/style.css
├── js/
│   ├── main.js        # oppstart og kobling mellom hjul, tilstand og tabell
│   ├── state.js       # tilstand, localStorage og URL-parametre
│   ├── pace.js        # ren matematikk (pace ↔ fart ↔ tid, formatering)
│   ├── wheel.js       # gjenbrukbart scroll-hjul
│   ├── distances.js   # distansene og egen distanse
│   ├── device.js      # enkel enhetsdeteksjon (iOS-hint for Hjem-skjerm)
│   └── i18n.js        # norske og engelske tekster
├── assets/            # icon.svg + PNG-ikoner (180/192/512)
├── manifest.webmanifest
├── scripts/
│   ├── serve.mjs      # liten lokal utviklingsserver
│   └── make-icons.mjs # lager PNG-ikonene fra icon.svg
├── test/pace.test.mjs # node --test test/pace.test.mjs
└── plans/pace-plan.md
```

### Kjøre lokalt

Siden bruker ES-moduler, så den må serveres over HTTP:

```
cd pace
node scripts/serve.mjs 8000
```

(eller `npx serve -l 8000` / `python -m http.server 8000`). Åpne <http://localhost:8000>.
Alternativt: VS Code-utvidelsen «Live Server».

### Tester

```
node --test test/pace.test.mjs
```

### Publisere en ny versjon

GitHub Pages cacher alle filer i 10 minutter, og nettlesere kan holde på gamle JS/CSS-filer
lenger enn det. Alle ressursene i `index.html` har derfor en `?v=`-parameter (også
ES-modul-importene, via et *import map*). Bump den før du committer:

```
node scripts/bump-version.mjs
git commit -am "..." && git push
```

Da får brukerne alltid et komplett, matchende sett med filer uten å måtte tømme cache.

## Publisere på GitHub Pages

1. Opprett et offentlig repo kalt `pace` på GitHub (bruker `knekk`).
2. Push koden til `main`.
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   velg `main` og `/ (root)`. Lagre.
4. Etter ca. ett minutt er siden live på `https://knekk.github.io/pace/`.

## Lisens

MIT – se [LICENSE](LICENSE).
