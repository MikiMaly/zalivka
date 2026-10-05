// Úložiště v prohlížeči (localStorage). Žádný server: data zůstávají na
// zařízení, kde je zadáš. Záloha a přenos na jiné zařízení = export/import JSON.

import type { LightKey, MaterialKey, Plant, SpeciesKey, WateringEvent } from './model'
import { LIGHT, MATERIALS, SPECIES } from './model'

const KEY = 'zalivka:v1'

export type StoredPlant = Omit<Plant, 'last_ts' | 'water_count'>

export type Data = {
  version: 1
  plants: StoredPlant[]
  events: WateringEvent[]
}

const EMPTY: Data = { version: 1, plants: [], events: [] }

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export function load(): Data {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return validate(JSON.parse(raw))
  } catch {
    /* prázdné nebo nedostupné úložiště (anonymní okno apod.) */
  }
  return EMPTY
}

export function save(data: Data): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

/** Rostliny doplněné o poslední zálivku a jejich počet. */
export function withStats(data: Data): Plant[] {
  return data.plants.map((p) => {
    const evs = data.events.filter((e) => e.plant_id === p.id)
    const last = evs.reduce<string | null>((m, e) => (m === null || e.ts > m ? e.ts : m), null)
    return { ...p, last_ts: last, water_count: evs.length }
  })
}

export function addPlant(
  data: Data,
  p: { name: string; species: SpeciesKey; pot_cm: number; material: MaterialKey; light: LightKey },
): Data {
  const plant: StoredPlant = { id: newId(), created_at: new Date().toISOString(), ...p }
  return { ...data, plants: [...data.plants, plant] }
}

export function removePlant(data: Data, id: string): Data {
  return {
    ...data,
    plants: data.plants.filter((p) => p.id !== id),
    events: data.events.filter((e) => e.plant_id !== id),
  }
}

export function water(data: Data, plantId: string, ml: number | null): Data {
  const ev: WateringEvent = { id: newId(), plant_id: plantId, ts: new Date().toISOString(), ml, note: null }
  return { ...data, events: [...data.events, ev] }
}

export function removeEvent(data: Data, id: string): Data {
  return { ...data, events: data.events.filter((e) => e.id !== id) }
}

export function historyOf(data: Data, plantId: string): WateringEvent[] {
  return data.events
    .filter((e) => e.plant_id === plantId)
    .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))
}

// ---- záloha --------------------------------------------------------------

export function exportJson(data: Data): string {
  return JSON.stringify(data, null, 2)
}

/** Přečte zálohu; vyhodí chybu s českou zprávou, když soubor nesedí. */
export function importJson(text: string): Data {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Soubor není platný JSON.')
  }
  return validate(parsed)
}

function validate(raw: unknown): Data {
  const d = raw as Partial<Data>
  if (!d || typeof d !== 'object' || !Array.isArray(d.plants) || !Array.isArray(d.events)) {
    throw new Error('Soubor nevypadá jako záloha Zálivky.')
  }
  const plants = d.plants.filter(
    (p): p is StoredPlant =>
      !!p &&
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      p.species in SPECIES &&
      p.material in MATERIALS &&
      p.light in LIGHT &&
      Number.isFinite(p.pot_cm),
  )
  const ids = new Set(plants.map((p) => p.id))
  const events = d.events.filter(
    (e): e is WateringEvent =>
      !!e && typeof e.id === 'string' && ids.has(e.plant_id) && typeof e.ts === 'string',
  )
  return { version: 1, plants, events }
}
