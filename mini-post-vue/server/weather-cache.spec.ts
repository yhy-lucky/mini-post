import { describe, expect, it } from 'vitest'
import { WEATHER_TTL } from '../src/constants/weather.ts'
import { createClock, createHarness } from './testing.ts'
import type { WeatherCache, WeatherData } from '../src/types/index.ts'

type CacheBody = { cache: WeatherCache | null }
type ErrorBody = { error: { code: string } }

const data: WeatherData = { temperature: 21.5, apparent: 20.8, humidity: 44, code: 1 }

const payload = {
  location: { name: '北京', latitude: 39.9042, longitude: 116.4074 },
  data
}

describe('GET /api/weather-cache', () => {
  it('无缓存返回 null', async () => {
    const api = createHarness()
    const res = await api.json<CacheBody>('/api/weather-cache')
    expect(res.status).toBe(200)
    expect(res.body.cache).toBeNull()
  })
})

describe('PUT /api/weather-cache', () => {
  it('计算两位小数指纹并以注入时钟作为 fetchedAt', async () => {
    const clock = createClock(1_700_000_000_000)
    const api = createHarness({ now: clock.now })

    const res = await api.send<CacheBody>('/api/weather-cache', 'PUT', payload)
    expect(res.status).toBe(200)
    expect(res.body.cache?.locationKey).toBe('39.90,116.41')
    expect(res.body.cache?.fetchedAt).toBe(1_700_000_000_000)
    expect(res.body.cache?.data).toEqual(data)

    const hit = await api.json<CacheBody>('/api/weather-cache?locationKey=39.90,116.41')
    expect(hit.body.cache).not.toBeNull()
  })

  it('显式传入的 fetchedAt 被保留', async () => {
    const api = createHarness()
    const res = await api.send<CacheBody>('/api/weather-cache', 'PUT', {
      ...payload,
      fetchedAt: 1700000000123
    })
    expect(res.body.cache?.fetchedAt).toBe(1700000000123)
  })

  it('超过 30 分钟返回 null 但不删除数据', async () => {
    const clock = createClock()
    const api = createHarness({ now: clock.now })
    await api.send('/api/weather-cache', 'PUT', payload)

    clock.advance(WEATHER_TTL + 1)
    const res = await api.json<CacheBody>('/api/weather-cache')
    expect(res.body.cache).toBeNull()
    expect(api.store.readWeatherCache()).not.toBeNull()
  })

  it('locationKey 不匹配返回 null', async () => {
    const api = createHarness()
    await api.send('/api/weather-cache', 'PUT', payload)
    const res = await api.json<CacheBody>('/api/weather-cache?locationKey=30.00,120.00')
    expect(res.body.cache).toBeNull()
  })

  it('未传 locationKey 时忽略指纹校验', async () => {
    const api = createHarness()
    await api.send('/api/weather-cache', 'PUT', payload)
    const res = await api.json<CacheBody>('/api/weather-cache')
    expect(res.body.cache?.locationKey).toBe('39.90,116.41')
  })

  it('data 非法 → 400 INVALID_BODY', async () => {
    const api = createHarness()
    const res = await api.send<ErrorBody>('/api/weather-cache', 'PUT', {
      location: payload.location,
      data: { temperature: 'hot' }
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_BODY')
  })

  it('location 缺经纬度 → 400 INVALID_BODY', async () => {
    const api = createHarness()
    const res = await api.send<ErrorBody>('/api/weather-cache', 'PUT', { location: { name: 'x' }, data })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_BODY')
  })
})
