# ⏱️ Pace

Pace-kalkulator for løpere: **min/km ↔ km/t ↔ sluttid**.

**👉 Bruk den her: <https://knekk.github.io/pace/>**

- Scroll minutter og sekunder på **pace** (f.eks. `4:00 min/km`) og se farten (`15,0 km/t`).
- Scroll på **fart** og se pacen – begge veier er koblet sammen.
- Velg en distanse og scroll en **sluttid** (f.eks. 10 km på `45:00`) for å få pacen (`4:30 min/km`).
- Tider for **400 m, 800 m, 1 km, 2 km, 3 km, 5 km, 10 km, halvmaraton og maraton** på den
  gjeldende pacen. Trykk på en distanse for å velge den i sluttid-kortet.
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
| `dist`    | `?dist=10k`     | valgt distanse: `400 800 1k 2k 3k 5k 10k hm m`           |
| `time`    | `?time=45:00`   | sluttid på `dist` – setter pacen (vinner over `pace`)    |

Eksempler:

- `https://knekk.github.io/pace/?pace=4:00`
- `https://knekk.github.io/pace/?dist=hm&time=1:30:00`
- `https://knekk.github.io/pace/?lang=en&unit=mi&speed=7.5`

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
│   ├── distances.js   # distansene
│   └── i18n.js        # norske og engelske tekster
├── assets/icon.svg
├── test/pace.test.mjs # node --test test/pace.test.mjs
└── plans/pace-plan.md
```

### Kjøre lokalt

Siden bruker ES-moduler, så den må serveres over HTTP:

```
cd pace
npx serve -l 8000
```

(eller `python -m http.server 8000` hvis du har Python). Åpne <http://localhost:8000>.
Alternativt: VS Code-utvidelsen «Live Server».

### Tester

```
node --test test/pace.test.mjs
```

## Publisere på GitHub Pages

1. Opprett et offentlig repo kalt `pace` på GitHub (bruker `knekk`).
2. Push koden til `main`.
3. **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   velg `main` og `/ (root)`. Lagre.
4. Etter ca. ett minutt er siden live på `https://knekk.github.io/pace/`.

## Lisens

MIT – se [LICENSE](LICENSE).
