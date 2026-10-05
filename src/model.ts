// Výpočetní model Zálivky: kdy a kolik zalévat.
// Stejný model běží v privátní sekci na mmaly.cz; tady bez serveru a bez účtů.

export const DAY = 86_400_000

export type SpeciesKey =
  | 'sukulent' | 'kaktus' | 'stredomorska' | 'tropicka'
  | 'orchidej' | 'kapradina' | 'bylinka'
export type MaterialKey = 'terakota' | 'plast' | 'glazura'
export type LightKey = 'slunce' | 'neprime' | 'polostin' | 'stin'
export type Status = 'over' | 'soon' | 'ok'

// base = dny mezi zálivkami ve vegetační sezóně
// frac = podíl objemu substrátu, který padne na jednu zálivku
export const SPECIES: Record<SpeciesKey, { label: string; short: string; base: number; frac: number }> = {
  sukulent:     { label: 'Sukulent / tučnolist',                short: 'Sukulent',     base: 14, frac: 0.10 },
  kaktus:       { label: 'Kaktus',                              short: 'Kaktus',       base: 16, frac: 0.10 },
  stredomorska: { label: 'Středomořská (rozmarýn, oliva)',       short: 'Středomořská', base: 9,  frac: 0.13 },
  tropicka:     { label: 'Tropická pokojovka (monstera, potos)', short: 'Tropická',     base: 6,  frac: 0.15 },
  orchidej:     { label: 'Orchidej',                            short: 'Orchidej',     base: 8,  frac: 0.12 },
  kapradina:    { label: 'Kapradina / vlhkomilná (calathea)',    short: 'Kapradina',    base: 3,  frac: 0.20 },
  bylinka:      { label: 'Bylinka (bazalka, petržel)',           short: 'Bylinka',      base: 2,  frac: 0.20 },
}

export const MATERIALS: Record<MaterialKey, { label: string; f: number }> = {
  terakota: { label: 'Terakota', f: 0.85 },      // dýchá, schne rychleji
  plast:    { label: 'Plast', f: 1.0 },
  glazura:  { label: 'Glazovaná keramika', f: 1.1 },
}

export const LIGHT: Record<LightKey, { label: string; f: number }> = {
  slunce:   { label: 'Přímé slunce (jih)', f: 0.8 },
  neprime:  { label: 'Světlo nepřímé', f: 1.0 },
  polostin: { label: 'Polostín', f: 1.15 },
  stin:     { label: 'Stín (sever)', f: 1.3 },
}

// Rostlina tak, jak ji vidí výpočet a UI (last_ts a water_count dopočítá store).
export type Plant = {
  id: string
  name: string
  species: SpeciesKey
  pot_cm: number
  material: MaterialKey
  light: LightKey
  created_at: string
  last_ts: string | null
  water_count: number
}

export type WateringEvent = {
  id: string
  plant_id: string
  ts: string
  ml: number | null
  note: string | null
}

export function seasonInfo(month: number): { key: string; f: number } {
  if (month >= 5 && month <= 7) return { key: 'léto', f: 1.0 }
  if (month >= 2 && month <= 4) return { key: 'jaro', f: 1.1 }
  if (month >= 8 && month <= 10) return { key: 'podzim', f: 1.4 }
  return { key: 'zima', f: 1.9 }    // vegetační klid, zalévat výrazně méně
}

// Větší květináč = víc zásoby vody = delší interval.
export function potFactor(d: number): number {
  if (d < 13) return 0.8
  if (d < 20) return 1.0
  if (d < 28) return 1.2
  return 1.4
}

export type Computed = {
  interval: number
  ml: number
  due: Date | null        // null = rostlina ještě nebyla zalita
  days: number | null
  status: Status
  season: { key: string; f: number }
  f: { base: number; pot: number; mat: number; light: number; season: number }
}

export function compute(p: Plant, now = new Date()): Computed {
  const s = seasonInfo(now.getMonth())
  const dr = SPECIES[p.species]
  const interval = Math.max(
    1,
    Math.round(dr.base * potFactor(p.pot_cm) * MATERIALS[p.material].f * LIGHT[p.light].f * s.f),
  )

  // Objem substrátu ≈ π·(Ø/2)²·výška, výška ≈ 0.8·Ø. Z toho frac na zálivku,
  // zaokrouhleno na desítky ml — "zalít, dokud neodteče do misky".
  const volMl = Math.PI * (p.pot_cm / 2) ** 2 * (0.8 * p.pot_cm)
  const ml = Math.max(20, Math.round((volMl * dr.frac) / 10) * 10)

  const f = {
    base: dr.base, pot: potFactor(p.pot_cm),
    mat: MATERIALS[p.material].f, light: LIGHT[p.light].f, season: s.f,
  }

  // Založení rostliny není zálivka, takže bez jediného zápisu je termín "hned".
  if (!p.last_ts) return { interval, ml, due: null, days: null, status: 'over', season: s, f }

  const due = new Date(new Date(p.last_ts).getTime() + interval * DAY)
  const days = Math.ceil((due.getTime() - now.getTime()) / DAY)
  // Dnešní termín je stejně naléhavý jako prošlý — proto 0 padá do 'over'.
  const status: Status = days <= 0 ? 'over' : days <= 2 ? 'soon' : 'ok'

  return { interval, ml, due, days, status, season: s, f }
}

export function denWord(n: number): string {
  const a = Math.abs(n)
  if (a === 1) return 'den'
  if (a >= 2 && a <= 4) return 'dny'
  return 'dní'
}

export function plantWord(n: number): string {
  if (n === 1) return 'rostlina'
  if (n >= 2 && n <= 4) return 'rostliny'
  return 'rostlin'
}

export function relDays(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / DAY)
  if (d <= 0) return 'dnes'
  if (d === 1) return 'včera'
  // 7. pád, ne 2. — "před 9 dny", ne "před 9 dní".
  return `před ${d} dny`
}

export const dayMonth = new Intl.DateTimeFormat('cs-CZ', { day: 'numeric', month: 'numeric' })
export const dayMonthTime = new Intl.DateTimeFormat('cs-CZ', {
  day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
})

export function whenText(c: Computed): string {
  if (c.days === null) return 'ještě nezalito'
  if (c.days < 0) return `po termínu o ${Math.abs(c.days)} ${denWord(c.days)}`
  if (c.days === 0) return 'termín dnes'
  if (c.days === 1) return 'zítra'
  return `za ${c.days} ${denWord(c.days)}`
}

export function bigText(c: Computed): string {
  if (c.days === null) return '—'
  if (c.days < 0) return `−${Math.abs(c.days)} d`
  if (c.days === 0) return 'dnes'
  return `${c.days} d`
}

export const STATUS_LABEL: Record<Status, string> = { over: 'Zalít teď', soon: 'Brzy', ok: 'OK' }

export const STATUS_PILL: Record<Status, string> = {
  over: 'hub-pill-danger',
  soon: 'hub-pill-warn',
  ok:   'hub-pill-ok',
}

export const STATUS_EDGE: Record<Status, string> = {
  over: 'hub-edge-danger',
  soon: 'hub-edge-warn',
  ok:   'hub-edge-ok',
}

export const STATUS_BIG: Record<Status, string> = {
  over: 'text-danger',
  soon: 'text-warning',
  ok:   'text-success',
}
