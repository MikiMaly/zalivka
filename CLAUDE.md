# zalivka

Veřejná open-source verze modulu Zálivka z mmaly.cz (MIT). Běží jen v prohlížeči,
data v localStorage, žádný server ani účty. Jazyk: UI, komentáře i commity česky,
README česky s krátkým anglickým odstavcem.

- `src/model.ts` — výpočet intervalu a ml. Kopie modelu z `MikiMaly/hub`
  (`src/pages/ZalivkaPage.tsx`); při změně modelu upravit na obou místech.
- `src/store.ts` — localStorage, export/import zálohy (validuje vstup).
- `src/App.tsx` — UI.
- Build = jeden soběstačný `dist/index.html` (vite-plugin-singlefile), proto žádné
  soubory v `public/` (ikona je inline data URI v `index.html`).
- **Nikdy sem nedávat žádná osobní data** (rostliny, zálohy, screenshoty s daty z mmaly.cz).

## Vizuální identita (převzatá z mmaly.cz „Skleník")

- Barvy jen přes tokeny ze `src/theme.css` (`primary`, `mint`, `aqua`, `raspberry`,
  `apricot`, `success`, `warning`, `danger`, `info`), žádné přímé Tailwind barvy.
  Hex kódy jen v bloku „Paleta" v `theme.css` a v inline ikoně v `index.html`.
- Komponenty z tříd `.hub-*` v `theme.css` (`.hub-card`, `.hub-btn-*`, `.hub-input`,
  `.hub-pill-*`, `.hub-label`, `.hub-eyebrow` …).
- Sémantika: voda = akvamarín, zalít teď = malina, brzy = meruňka, OK = zelená.
