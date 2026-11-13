/**
 * 天气缓存的 REST 调用。
 * TTL（30 分钟）与指纹校验由服务端完成，前端只负责拼 locationKey 与结构兜底。
 */

import { ApiError, apiRequest } from '@/api/client'
import type { Location, WeatherCache, WeatherData } from '@/types'

const INVALID_RESPONSE_STATUS = 200

function invalidResponse(message: string): ApiError {
  return new ApiError('INVALID_RESPONSE', message, INVALID_RESPONSE_STATUS)
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** 经纬度保留两位小数作为缓存指纹（沿用旧 localStorage 版算法） */
export function locationKey(location: Pick<Location, 'latitude' | 'longitude'>): string {
  return `${Number(location.latitude).toFixed(2)},${Number(location.longitude).toFixed(2)}`
}

/** 任意数据 → 合法 WeatherCache；缺少 data 说明这条缓存不可用 */
function normalizeCache(raw: unknown): WeatherCache {
  const item = toRecord(raw)
  if (!item) throw invalidResponse('服务端返回的天气缓存不是对象')

  const data = toRecord(item.data)
  if (!data) throw invalidResponse('服务端返回的天气缓存缺少 data')

  const locationRaw = toRecord(item.location)
  const latitude = toNumber(locationRaw?.latitude, 0)
  const longitude = toNumber(locationRaw?.longitude, 0)
  const temperature = toNumber(data.temperature, 0)

  const key = item.locationKey
  const rawName = locationRaw?.name

  return {
    locationKey: typeof key === 'string' && key !== '' ? key : locationKey({ latitude, longitude }),
    location: {
      name: typeof rawName === 'string' && rawName !== '' ? rawName : '当前位置',
      latitude,
      longitude
    },
    fetchedAt: toNumber(item.fetchedAt, 0),
    data: {
      temperature,
      apparent: toNumber(data.apparent, temperature),
      humidity: toNumber(data.humidity, 0),
      code: toNumber(data.code, 3)
    }
  }
}

/** 取 { cache } 响应体；cache 为 null 表示服务端没有可用缓存 */
function pickCache(payload: unknown): WeatherCache | null {
  const container = toRecord(payload)
  if (!container) throw invalidResponse('服务端返回的天气缓存响应不是对象')

  const cache = container.cache
  if (cache === null || cache === undefined) return null

  return normalizeCache(cache)
}

/**
 * GET /api/weather-cache?locationKey=39.90,116.41
 * 未选择城市时不发请求，直接返回 null（没有 location 就没有可用的缓存指纹）。
 */
export async function fetchWeatherCache(
  location: Location | null,
  options: { signal?: AbortSignal } = {}
): Promise<WeatherCache | null> {
  if (!location) return null

  const key = locationKey(location)
  const payload = await apiRequest<unknown>(`/weather-cache?locationKey=${key}`, {
    signal: options.signal
  })

  return pickCache(payload)
}

/**
 * PUT /api/weather-cache
 * now 缺省时不发送 fetchedAt，由服务端自己取 Date.now()。
 */
export async function saveWeatherCache(
  location: Location,
  data: WeatherData,
  now?: number
): Promise<WeatherCache> {
  const body: {
    location: Pick<Location, 'name' | 'latitude' | 'longitude'>
    data: WeatherData
    fetchedAt?: number
  } = {
    location: { name: location.name, latitude: location.latitude, longitude: location.longitude },
    data: {
      temperature: data.temperature,
      apparent: data.apparent,
      humidity: data.humidity,
      code: data.code
    }
  }

  if (typeof now === 'number') body.fetchedAt = now

  const payload = await apiRequest<unknown>('/weather-cache', { method: 'PUT', body })
  const cache = pickCache(payload)

  if (!cache) throw invalidResponse('服务端未返回天气缓存')

  return cache
}
