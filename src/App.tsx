import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Download, Droplet, History, Plus, Sprout, Trash2, Upload } from 'lucide-react'
import {
  LIGHT, MATERIALS, SPECIES, STATUS_BIG, STATUS_EDGE, STATUS_LABEL, STATUS_PILL,
  bigText, compute, dayMonth, dayMonthTime, denWord, plantWord, relDays, seasonInfo, whenText,
  type Computed, type LightKey, type MaterialKey, type Plant, type SpeciesKey, type Status,
  type WateringEvent,
} from './model'
import * as store from './store'

export default function App() {
  const [data, setDataRaw] = useState<store.Data>(store.load)
  const [error, setError] = useState<string | null>(null)
  const busy = false

  // Každá změna se hned uloží; když úložiště nejde (anonymní okno, plné),
  // appka jede dál v paměti a řekne to.
  const setData = (next: store.Data) => {
    setDataRaw(next)
    setError(store.save(next) ? null : 'Prohlížeč nedovolil data uložit. Po zavření okna se ztratí, stáhni si zálohu.')
  }

  const [openHistory, setOpenHistory] = useState<string | null>(null)

  // formulář
  const [fName, setFName] = useState('')
  const [fSpecies, setFSpecies] = useState<SpeciesKey>('tropicka')
  const [fPot, setFPot] = useState('18')
  const [fMaterial, setFMaterial] = useState<MaterialKey>('plast')
  const [fLight, setFLight] = useState<LightKey>('neprime')

  const plants = useMemo(() => store.withStats(data), [data])
  const historyOf = store.historyOf
  const season = useMemo(() => seasonInfo(new Date().getMonth()), [])

  const rows = useMemo(
    () =>
      plants
        .map((p) => ({ p, c: compute(p) }))
        // Nezalité rostliny napřed, pak podle toho, komu termín hoří nejvíc.
        .sort((a, b) => (a.c.days ?? -9999) - (b.c.days ?? -9999)),
    [plants],
  )

  const counts = useMemo(() => {
    let over = 0, soon = 0, ok = 0
    for (const { c } of rows) {
      if (c.status === 'over') over++
      else if (c.status === 'soon') soon++
      else ok++
    }
    return { over, soon, ok }
  }, [rows])

  const water = (p: Plant, c: Computed) => setData(store.water(data, p.id, c.ml))

  const removePlant = (id: string) => {
    const p = data.plants.find((x) => x.id === id)
    if (p && !confirm(`Smazat ${p.name} i s historií zálivek?`)) return
    if (openHistory === id) setOpenHistory(null)
    setData(store.removePlant(data, id))
  }

  const toggleHistory = (plantId: string) => setOpenHistory((o) => (o === plantId ? null : plantId))

  const removeEvent = (ev: WateringEvent) => setData(store.removeEvent(data, ev.id))

  const add = () => {
    const pot = Number.parseInt(fPot, 10)
    setData(
      store.addPlant(data, {
        name: (fName.trim() || SPECIES[fSpecies].short).slice(0, 80),
        species: fSpecies,
        pot_cm: Number.isFinite(pot) ? Math.min(60, Math.max(6, pot)) : 18,
        material: fMaterial,
        light: fLight,
      }),
    )
    setFName('')
  }

  const doExport = () => {
    const blob = new Blob([store.exportJson(data)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `zalivka-zaloha-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const next = store.importJson(await file.text())
      if (!confirm(`Nahradit současná data zálohou (${next.plants.length} ${plantWord(next.plants.length)})?`)) return
      setData(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="hub-page">
      <div className="hub-container pb-12">
        <header className="pt-8 pb-6 flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 min-w-0">
            <div className="hub-icon-tile text-2xl">🪴</div>
            <div className="min-w-0">
              <div className="hub-eyebrow mb-1.5">Rostliny</div>
              <h1 className="hub-title text-3xl sm:text-4xl">
                Zálivka<span className="text-raspberry">.</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Kdy a kolik zalévat · data jen v tomhle prohlížeči</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="hub-chip px-3 py-1.5 tabular-nums">
              období <b className="text-mint font-semibold">{season.key}</b> · ×{season.f}
            </span>
            <button onClick={doExport} className="hub-btn hub-btn-sm hub-btn-ghost" title="Stáhnout zálohu jako JSON">
              <Download className="w-4 h-4" /> Záloha
            </button>
            <label className="hub-btn hub-btn-sm hub-btn-ghost cursor-pointer" title="Nahrát zálohu z JSON">
              <Upload className="w-4 h-4" /> Obnovit
              <input type="file" accept="application/json,.json" onChange={doImport} className="hidden" />
            </label>
          </div>
        </header>

        {error && (
          <p className="mb-5 px-4 py-3 rounded-xl bg-raspberry/10 border border-raspberry/25 text-raspberry text-sm" role="alert">
            {error}
          </p>
        )}

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
          <Tile n={counts.over} k="Zalít teď" tone="over" />
          <Tile n={counts.soon} k="Brzy (1–2 dny)" tone="soon" />
          <Tile n={counts.ok} k="V pohodě" tone="ok" />
          <Tile n={plants.length} k="Rostlin celkem" tone="all" />
        </section>

        {/* Formulář je pořád rozbalený — na šířku monitoru se vejde do jedné řady
            a klikat na rozbalení pokaždé, když přibude rostlina, nemá smysl. */}
        <div className="hub-card mb-8">
          <div className="flex items-center gap-2 px-5 pt-4">
            <Plus className="w-4 h-4 text-primary shrink-0" />
            <span className="font-semibold">Přidat rostlinu</span>
          </div>

            <div className="px-5 py-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-end">
              <Field label="Název">
                <input
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') add() }}
                  placeholder="např. Monstera u okna"
                  className="hub-input"
                />
              </Field>
              <Field label="Druh">
                <select
                  value={fSpecies}
                  onChange={(e) => setFSpecies(e.target.value as SpeciesKey)}
                  className="hub-input"
                >
                  {(Object.keys(SPECIES) as SpeciesKey[]).map((k) => (
                    <option key={k} value={k}>{SPECIES[k].label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Ø květináče (cm)">
                <input
                  type="number" min={6} max={60}
                  value={fPot}
                  onChange={(e) => setFPot(e.target.value)}
                  className="hub-input tabular-nums"
                />
              </Field>
              <Field label="Materiál">
                <select
                  value={fMaterial}
                  onChange={(e) => setFMaterial(e.target.value as MaterialKey)}
                  className="hub-input"
                >
                  {(Object.keys(MATERIALS) as MaterialKey[]).map((k) => (
                    <option key={k} value={k}>{MATERIALS[k].label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Umístění / světlo">
                <select
                  value={fLight}
                  onChange={(e) => setFLight(e.target.value as LightKey)}
                  className="hub-input"
                >
                  {(Object.keys(LIGHT) as LightKey[]).map((k) => (
                    <option key={k} value={k}>{LIGHT[k].label}</option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end">
                <button onClick={add} disabled={busy} className="hub-btn hub-btn-primary w-full">
                  Přidat rostlinu
                </button>
              </div>
            </div>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <h2 className="hub-title text-xl">Moje rostliny</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {plants.length} {plantWord(plants.length)}
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="hub-card p-8 text-center">
            <Sprout className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Zatím žádné rostliny — přidej si první nahoře.
            </p>
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 items-start">
            {rows.map(({ p, c }, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3) }}
                className={'hub-card p-5 flex flex-col gap-3 ' + STATUS_EDGE[c.status]}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate font-semibold" title={p.name}>{p.name}</span>
                  <span className={'hub-pill font-mono uppercase tracking-[0.1em] shrink-0 ' + STATUS_PILL[c.status]}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{SPECIES[p.species].short}</span>
                  <span className="tabular-nums">Ø {p.pot_cm} cm</span>
                  <span>{MATERIALS[p.material].label}</span>
                  <span>{LIGHT[p.light].label}</span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className={'hub-num text-3xl font-semibold ' + STATUS_BIG[c.status]}>
                    {bigText(c)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {whenText(c)}{c.due ? ` · ${dayMonth.format(c.due)}` : ''}
                  </span>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground hub-divider pt-2.5 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Droplet className="w-3 h-3 text-aqua" />
                    <b className="text-aqua">≈ {c.ml} ml</b>
                  </span>
                  <span>á {c.interval} {denWord(c.interval)}</span>
                  <button
                    onClick={() => toggleHistory(p.id)}
                    className="inline-flex items-center gap-1 hover:text-mint"
                    aria-expanded={openHistory === p.id}
                  >
                    <History className="w-3 h-3" />
                    {p.water_count}× zalito
                  </button>
                </div>

                {openHistory === p.id && (
                  <div className="rounded-xl border border-border bg-secondary/60 p-3">
                    {historyOf(data, p.id).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Zatím žádná zálivka.</p>
                    ) : (
                      <ul className="space-y-1.5 max-h-52 overflow-y-auto">
                        {historyOf(data, p.id).map((ev) => (
                          <li key={ev.id} className="flex items-center gap-2 text-xs">
                            <Droplet className="w-3 h-3 text-aqua shrink-0" />
                            <span className="tabular-nums">{dayMonthTime.format(new Date(ev.ts))}</span>
                            {ev.ml !== null && (
                              <span className="text-muted-foreground tabular-nums">{ev.ml} ml</span>
                            )}
                            <button
                              onClick={() => removeEvent(ev)}
                              disabled={busy}
                              className="ml-auto p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                              aria-label="Smazat zápis"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <details className="text-[0.7rem] text-muted-foreground">
                  <summary className="cursor-pointer">výpočet</summary>
                  <p className="mt-1.5 leading-relaxed tabular-nums">
                    {c.f.base} × {c.f.pot} (Ø) × {c.f.mat} (mat.) × {c.f.light} (světlo) ×{' '}
                    {c.f.season} ({c.season.key}) = <b className="text-foreground">{c.interval} {denWord(c.interval)}</b>{' '}
                    mezi zálivkami
                  </p>
                </details>

                <div className="flex items-center justify-between gap-2 mt-auto">
                  <span className="text-xs text-muted-foreground">
                    {p.last_ts ? `naposledy ${relDays(p.last_ts)}` : 'ještě nezalito'}
                  </span>
                  <span className="flex items-center gap-1">
                    <button onClick={() => water(p, c)} disabled={busy} className="hub-btn hub-btn-sm hub-btn-aqua">
                      <Droplet className="w-3 h-3" /> Zalít
                    </button>
                    <button
                      onClick={() => removePlant(p.id)}
                      disabled={busy}
                      className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      aria-label={`Smazat ${p.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
              </motion.div>
            ))}
          </section>
        )}

        <details className="mt-10 hub-card px-5">
          <summary className="cursor-pointer py-4 text-sm font-semibold hover:text-mint">
            Jak modul počítá zálivku
          </summary>
          <div className="pb-5 text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              Interval mezi zálivkami je <b>základ podle druhu</b> násobený korekcemi za velikost
              a materiál květináče, světlo a roční období:
            </p>
            <p className="tabular-nums text-foreground">
              interval = základ × Ø-květináč × materiál × světlo × období
            </p>
            <div>
              <h3 className="hub-label text-mint mb-1">Základ (vegetační sezóna, dny)</h3>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Sukulent 14 · Kaktus 16 · Středomořská 9</li>
                <li>Tropická pokojovka 6 · Orchidej 8</li>
                <li>Kapradina / vlhkomilná 3 · Bylinka 2</li>
              </ul>
            </div>
            <div>
              <h3 className="hub-label text-mint mb-1">Korekce</h3>
              <ul className="list-disc pl-5 space-y-0.5">
                <li><b>Ø květináče:</b> &lt;13 cm ×0.8 · 13–20 ×1.0 · 20–28 ×1.2 · &gt;28 ×1.4 — větší = víc zásoby vody</li>
                <li><b>Materiál:</b> terakota ×0.85 (dýchá, schne rychleji) · plast ×1.0 · glazura ×1.1</li>
                <li><b>Světlo:</b> přímé slunce ×0.8 · nepřímé ×1.0 · polostín ×1.15 · stín ×1.3</li>
                <li><b>Období:</b> léto ×1.0 · jaro ×1.1 · podzim ×1.4 · <b>zima ×1.9</b> — vegetační klid</li>
              </ul>
            </div>
            <div>
              <h3 className="hub-label text-mint mb-1">Kolik vody</h3>
              <p>
                Objem substrátu ≈ π·(Ø/2)²·výška (výška ≈ 0.8·Ø), z toho 10 % u sukulentů až 20 %
                u kapradin a bylinek — tedy „zalít, dokud neodteče do misky". Doporučení se ukládá
                ke každé zálivce, takže historie nezlže, když později vyměníš květináč.
              </p>
            </div>
            <div>
              <h3 className="hub-label text-mint mb-1">Kde jsou data</h3>
              <p>
                Jen v tomhle prohlížeči (localStorage), nikam se neposílají. Na jiné zařízení je
                přeneseš tlačítky Záloha a Obnovit. Smazání dat prohlížeče je smaže i tady.
              </p>
            </div>
          </div>
        </details>
      </div>
      <footer className="border-t border-border">
        <div className="hub-container py-6 flex flex-col sm:flex-row items-center justify-between gap-2 hub-label">
          <span>Zálivka · open source (MIT)</span>
          <a href="https://github.com/MikiMaly/zalivka" className="hover:text-mint" target="_blank" rel="noopener noreferrer">
            github.com/MikiMaly/zalivka
          </a>
        </div>
      </footer>
    </div>
  )
}

function Tile({ n, k, tone }: { n: number; k: string; tone: Status | 'all' }) {
  const color =
    tone === 'over' ? 'text-danger'
    : tone === 'soon' ? 'text-warning'
    : tone === 'ok' ? 'text-success'
    : 'text-mint'
  const edge =
    tone === 'over' ? 'hub-edge-danger'
    : tone === 'soon' ? 'hub-edge-warn'
    : tone === 'ok' ? 'hub-edge-ok'
    : 'hub-edge-info'
  return (
    <div className={'hub-card px-4 py-4 ' + edge}>
      <div className={'hub-num text-4xl font-semibold leading-none ' + color}>{n}</div>
      <div className="hub-label mt-2.5">{k}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="hub-label">{label}</span>
      {children}
    </label>
  )
}
