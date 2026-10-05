# Zálivka

Kdy a kolik zalévat pokojové rostliny. Jednoduchá webová appka, která běží jen
v prohlížeči: žádný účet, žádný server, data zůstávají u tebe.

**Spuštění:** stáhni zdrojový kód (Code → Download ZIP, nebo `git clone`) a sestav ho
(viz Vývoj níže). Výsledkem je jediný soubor `dist/index.html`, který stačí otevřít
v prohlížeči dvojklikem. Funguje i offline (jen písmo se bez internetu nahradí systémovým).

## Co umí

- interval zálivky podle **druhu rostliny, velikosti a materiálu květináče, světla a ročního období**
- doporučené **množství vody v ml**
- přehled, co **zalít teď**, co **brzy** a co je v pohodě
- historie zálivek u každé rostliny
- **záloha a obnovení** (JSON), třeba pro přenos mezi počítačem a mobilem

## Jak počítá

```
interval = základ podle druhu × Ø květináče × materiál × světlo × období
```

| Druh | Základ (dny) |
|---|---|
| Sukulent | 14 |
| Kaktus | 16 |
| Středomořská (rozmarýn, oliva) | 9 |
| Tropická pokojovka (monstera, potos) | 6 |
| Orchidej | 8 |
| Kapradina / vlhkomilná | 3 |
| Bylinka | 2 |

- **Ø květináče:** < 13 cm ×0.8 · 13–20 ×1.0 · 20–28 ×1.2 · > 28 ×1.4
- **Materiál:** terakota ×0.85 · plast ×1.0 · glazovaná keramika ×1.1
- **Světlo:** přímé slunce ×0.8 · nepřímé ×1.0 · polostín ×1.15 · stín ×1.3
- **Období:** léto ×1.0 · jaro ×1.1 · podzim ×1.4 · zima ×1.9

Množství vody: objem substrátu ≈ π·(Ø/2)²·0.8·Ø, z toho 10 % (sukulenty) až 20 %
(kapradiny, bylinky). Je to orientační pomůcka, ne botanická pravda: rostlině se
vždy vyplatí sáhnout do hlíny.

## Soukromí

Data se ukládají do `localStorage` tvého prohlížeče a nikam se neposílají. Smazání
dat prohlížeče je smaže i ze Zálivky, proto se hodí občas stáhnout zálohu.

## Vývoj

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/index.html, jeden soběstačný soubor (stačí otevřít v prohlížeči)
```

Potřebuješ [Node.js](https://nodejs.org) 20 nebo novější.

React + TypeScript + Vite + Tailwind 4. Výpočet je v `src/model.ts`, úložiště v
`src/store.ts`, UI v `src/App.tsx`. Vzhled vychází z vizuální identity
[mmaly.cz](https://mmaly.cz).

## Licence

[MIT](LICENSE) © 2026 Mikoláš Malý

---

**English:** a small browser-only app that tells you when and how much to water
your houseplants (Czech UI). No account, no server, data stays in your browser.
Download the source, run `npm install && npm run build` and open `dist/index.html`.
