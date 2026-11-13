import { normalizeSettings } from './validate.ts'
import type { AppSettings, Entry, WeatherCache } from '../src/types/index.ts'

/**
 * 进程内存存储。
 * 通过工厂函数创建，每个实例持有独立的私有状态（不使用模块级单例），
 * 这样测试之间、以及多 app 实例之间天然隔离。
 */
export interface Store {
  listEntries(): Entry[]
  getEntry(id: string): Entry | undefined
  insertEntry(entry: Entry): Entry
  patchEntry(id: string, patch: Partial<Entry>): Entry | undefined
  removeEntry(id: string): boolean
  readSettings(): AppSettings
  writeSettings(settings: AppSettings): AppSettings
  readWeatherCache(): WeatherCache | null
  writeWeatherCache(cache: WeatherCache): WeatherCache
  reset(): void
}

function cloneEntry(entry: Entry): Entry {
  return { ...entry, tags: [...entry.tags] }
}

function cloneSettings(settings: AppSettings): AppSettings {
  return {
    theme: settings.theme,
    location: settings.location ? { ...settings.location } : null
  }
}

export function createStore(): Store {
  let entries = new Map<string, Entry>()
  let settings: AppSettings = normalizeSettings(undefined)
  let weatherCache: WeatherCache | null = null

  return {
    listEntries() {
      return Array.from(entries.values())
        .map(cloneEntry)
        .sort((a, b) => b.createdAt - a.createdAt)
    },
    getEntry(id) {
      const entry = entries.get(id)
      return entry ? cloneEntry(entry) : undefined
    },
    insertEntry(entry) {
      entries.set(entry.id, cloneEntry(entry))
      return cloneEntry(entry)
    },
    patchEntry(id, patch) {
      const current = entries.get(id)
      if (!current) return undefined

      const next: Entry = {
        ...current,
        ...patch,
        id: current.id,
        tags: patch.tags ? [...patch.tags] : [...current.tags]
      }
      entries.set(id, next)
      return cloneEntry(next)
    },
    removeEntry(id) {
      return entries.delete(id)
    },
    readSettings() {
      return cloneSettings(settings)
    },
    writeSettings(next) {
      settings = cloneSettings(next)
      return cloneSettings(settings)
    },
    readWeatherCache() {
      return weatherCache
    },
    writeWeatherCache(next) {
      weatherCache = next
      return weatherCache
    },
    reset() {
      entries = new Map<string, Entry>()
      settings = normalizeSettings(undefined)
      weatherCache = null
    }
  }
}
