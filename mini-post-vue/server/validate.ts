import { MOODS } from '../src/constants/moods.ts'
import { MAX_LEN, MAX_TAGS } from '../src/constants/tags.ts'
import { DEFAULT_TIMEZONE, WEATHER_TTL } from '../src/constants/weather.ts'
import { countChars } from '../src/utils/text.ts'
import type {
  AppSettings,
  Location,
  MoodId,
  ThemeSetting,
  WeatherCache,
  WeatherData
} from '../src/types/index.ts'

export type ErrorCode =
  | 'INVALID_BODY'
  | 'EMPTY_CONTENT'
  | 'CONTENT_TOO_LONG'
  | 'INVALID_MOOD'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ErrorCode; message: string }

export const DEFAULT_LOCATION_NAME = '当前位置'

const MOOD_IDS: readonly string[] = MOODS.map((mood) => mood.id)

function ok<T>(value: T): ValidationResult<T> {
  return { ok: true, value }
}

function fail(code: ErrorCode, message: string): ValidationResult<never> {
  return { ok: false, code, message }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** 解析请求体原始文本为 JSON 对象 */
export function parseJsonObject(raw: string): ValidationResult<Record<string, unknown>> {
  if (raw.trim() === '') return fail('INVALID_BODY', '请求体不能为空')

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return fail('INVALID_BODY', '请求体必须是合法 JSON')
  }
  if (!isRecord(parsed)) return fail('INVALID_BODY', '请求体必须是 JSON 对象')
  return ok(parsed)
}

export function parseContent(value: unknown): ValidationResult<string> {
  if (typeof value !== 'string') return fail('INVALID_BODY', 'content 必须是字符串')

  const content = value.trim()
  if (content === '') return fail('EMPTY_CONTENT', '正文不能为空')
  if (countChars(content) > MAX_LEN) return fail('CONTENT_TOO_LONG', `正文最多 ${MAX_LEN} 个字`)
  return ok(content)
}

export function parseMood(value: unknown): ValidationResult<MoodId> {
  if (typeof value !== 'string' || !MOOD_IDS.includes(value)) {
    return fail('INVALID_MOOD', '心情不合法')
  }
  return ok(value as MoodId)
}

/** 只保留字符串，trim、去空、去重、截断到 MAX_TAGS */
export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const cleaned = value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => tag !== '')
  return Array.from(new Set(cleaned)).slice(0, MAX_TAGS)
}

export interface EntryCreateInput {
  content: string
  mood: MoodId
  tags: string[]
}

export function parseCreateEntry(body: Record<string, unknown>): ValidationResult<EntryCreateInput> {
  const content = parseContent(body.content)
  if (!content.ok) return content

  const mood = parseMood(body.mood)
  if (!mood.ok) return mood

  return ok({ content: content.value, mood: mood.value, tags: normalizeTags(body.tags) })
}

export interface EntryUpdateInput {
  content?: string
  mood?: MoodId
  tags?: string[]
}

export function parseUpdateEntry(body: Record<string, unknown>): ValidationResult<EntryUpdateInput> {
  const hasContent = 'content' in body
  const hasMood = 'mood' in body
  const hasTags = 'tags' in body
  if (!hasContent && !hasMood && !hasTags) {
    return fail('INVALID_BODY', '至少需要提供 content、mood、tags 之一')
  }

  const patch: EntryUpdateInput = {}
  if (hasContent) {
    const content = parseContent(body.content)
    if (!content.ok) return content
    patch.content = content.value
  }
  if (hasMood) {
    const mood = parseMood(body.mood)
    if (!mood.ok) return mood
    patch.mood = mood.value
  }
  if (hasTags) patch.tags = normalizeTags(body.tags)
  return ok(patch)
}

export function parseLike(body: Record<string, unknown>): ValidationResult<boolean> {
  if (typeof body.liked !== 'boolean') return fail('INVALID_BODY', 'liked 必须是布尔值')
  return ok(body.liked)
}

function normalizeTheme(value: unknown): ThemeSetting {
  return value === 'light' || value === 'dark' ? value : 'system'
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

export function normalizeLocation(value: unknown): Location | null {
  if (!isRecord(value)) return null
  if (!isFiniteNumber(value.latitude) || !isFiniteNumber(value.longitude)) return null

  return {
    name: nonEmptyString(value.name) ?? DEFAULT_LOCATION_NAME,
    latitude: value.latitude,
    longitude: value.longitude,
    timezone: nonEmptyString(value.timezone) ?? DEFAULT_TIMEZONE
  }
}

export function normalizeSettings(raw: unknown): AppSettings {
  const item = isRecord(raw) ? raw : {}
  return { theme: normalizeTheme(item.theme), location: normalizeLocation(item.location) }
}

/** 经纬度保留两位小数作为缓存指纹 */
export function locationKeyOf(location: Pick<Location, 'latitude' | 'longitude'>): string {
  return `${Number(location.latitude).toFixed(2)},${Number(location.longitude).toFixed(2)}`
}

export function parseWeatherData(value: unknown): ValidationResult<WeatherData> {
  if (!isRecord(value)) return fail('INVALID_BODY', 'data 必须是对象')

  const { temperature, apparent, humidity, code } = value
  if (
    !isFiniteNumber(temperature) ||
    !isFiniteNumber(apparent) ||
    !isFiniteNumber(humidity) ||
    !isFiniteNumber(code)
  ) {
    return fail('INVALID_BODY', 'data 需要数值型 temperature/apparent/humidity/code')
  }
  return ok({ temperature, apparent, humidity, code })
}

export interface WeatherCacheInput {
  location: Pick<Location, 'name' | 'latitude' | 'longitude'>
  data: WeatherData
  fetchedAt?: number
}

export function parseWeatherCacheInput(
  body: Record<string, unknown>
): ValidationResult<WeatherCacheInput> {
  if (!isRecord(body.location)) return fail('INVALID_BODY', 'location 必须是对象')

  const { latitude, longitude } = body.location
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
    return fail('INVALID_BODY', 'location 需要数值型 latitude/longitude')
  }

  const data = parseWeatherData(body.data)
  if (!data.ok) return data

  let fetchedAt: number | undefined
  if (body.fetchedAt !== undefined && body.fetchedAt !== null) {
    if (!isFiniteNumber(body.fetchedAt)) return fail('INVALID_BODY', 'fetchedAt 必须是数字')
    fetchedAt = body.fetchedAt
  }

  return ok({
    location: {
      name: nonEmptyString(body.location.name) ?? DEFAULT_LOCATION_NAME,
      latitude,
      longitude
    },
    data: data.value,
    fetchedAt
  })
}

export function isWeatherCacheFresh(cache: WeatherCache, now: number): boolean {
  return now - cache.fetchedAt <= WEATHER_TTL
}
