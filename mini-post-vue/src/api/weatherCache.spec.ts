import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { fetchWeatherCache, locationKey, saveWeatherCache } from '@/api/weatherCache'
import type { Location, WeatherCache, WeatherData } from '@/types'

const BEIJING: Location = {
  name: '北京',
  latitude: 39.9042,
  longitude: 116.4074,
  timezone: 'Asia/Shanghai'
}

const DATA: WeatherData = { temperature: 12.4, apparent: 10.8, humidity: 63, code: 3 }

const CACHE: WeatherCache = {
  locationKey: '39.90,116.41',
  location: { name: '北京', latitude: 39.9042, longitude: 116.4074 },
  fetchedAt: 1_700_000_000_000,
  data: DATA
}

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload
  } as unknown as Response
}

function brokenResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON')
    }
  } as unknown as Response
}

function stubFetch(response: Response) {
  const fetchMock = vi.fn().mockResolvedValue(response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function stubFetchReject(error: unknown) {
  const fetchMock = vi.fn().mockRejectedValue(error)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('预期抛出异常，但请求成功返回')
    },
    (error: unknown) => error
  )
}

describe('locationKey', () => {
  it('经纬度保留两位小数作为缓存指纹', () => {
    expect(locationKey(BEIJING)).toBe('39.90,116.41')
  })

  it('补零与负数都按 toFixed(2) 处理', () => {
    expect(locationKey({ latitude: 0, longitude: 0 })).toBe('0.00,0.00')
    expect(locationKey({ latitude: 12.3456, longitude: -7.891 })).toBe('12.35,-7.89')
    expect(locationKey({ latitude: 1.2, longitude: 3 })).toBe('1.20,3.00')
  })
})

describe('fetchWeatherCache', () => {
  it('未选择城市时不发请求，直接返回 null', async () => {
    const fetchMock = stubFetch(jsonResponse({ cache: CACHE }))

    await expect(fetchWeatherCache(null)).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('GET /api/weather-cache?locationKey=lat,lon', async () => {
    const fetchMock = stubFetch(jsonResponse({ cache: CACHE }))

    await fetchWeatherCache(BEIJING)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/weather-cache?locationKey=39.90,116.41')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
  })

  it('解析服务端缓存', async () => {
    stubFetch(jsonResponse({ cache: CACHE }))

    await expect(fetchWeatherCache(BEIJING)).resolves.toEqual(CACHE)
  })

  it('cache 为 null 时返回 null（服务端已做过期判断）', async () => {
    stubFetch(jsonResponse({ cache: null }))

    await expect(fetchWeatherCache(BEIJING)).resolves.toBeNull()
  })

  it('缺少 cache 字段时返回 null', async () => {
    stubFetch(jsonResponse({}))

    await expect(fetchWeatherCache(BEIJING)).resolves.toBeNull()
  })

  it('缓存缺字段时用安全默认值兜底', async () => {
    stubFetch(
      jsonResponse({
        cache: {
          location: { name: '北京', latitude: 39.9042, longitude: 116.4074 },
          data: { temperature: 12 }
        }
      })
    )

    await expect(fetchWeatherCache(BEIJING)).resolves.toEqual({
      locationKey: '39.90,116.41',
      location: { name: '北京', latitude: 39.9042, longitude: 116.4074 },
      fetchedAt: 0,
      data: { temperature: 12, apparent: 12, humidity: 0, code: 3 }
    })
  })

  it('cache 不是对象时抛 INVALID_RESPONSE（status 200）', async () => {
    stubFetch(jsonResponse({ cache: 'stale' }))

    const error = (await captureError(fetchWeatherCache(BEIJING))) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('INVALID_RESPONSE')
    expect(error.status).toBe(200)
  })

  it('cache 缺少 data 时抛 INVALID_RESPONSE', async () => {
    stubFetch(jsonResponse({ cache: { locationKey: '39.90,116.41', fetchedAt: 1 } }))

    const error = (await captureError(fetchWeatherCache(BEIJING))) as ApiError
    expect(error.code).toBe('INVALID_RESPONSE')
  })

  it('响应体不是对象时抛 INVALID_RESPONSE', async () => {
    stubFetch(jsonResponse(42))

    const error = (await captureError(fetchWeatherCache(BEIJING))) as ApiError
    expect(error.code).toBe('INVALID_RESPONSE')
  })

  it('透传 AbortSignal', async () => {
    const fetchMock = stubFetch(jsonResponse({ cache: null }))
    const controller = new AbortController()

    await fetchWeatherCache(BEIJING, { signal: controller.signal })

    expect(fetchMock.mock.calls[0]![1].signal).toBe(controller.signal)
  })

  it('AbortError 原样抛出', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    stubFetchReject(abortError)

    const error = await captureError(fetchWeatherCache(BEIJING))

    expect(error).toBe(abortError)
    expect(error).not.toBeInstanceOf(ApiError)
  })

  it('500 时抛服务端错误码', async () => {
    stubFetch(jsonResponse({ error: { code: 'WEATHER_UNAVAILABLE', message: '天气服务不可用' } }, 500))

    const error = (await captureError(fetchWeatherCache(BEIJING))) as ApiError

    expect(error.code).toBe('WEATHER_UNAVAILABLE')
    expect(error.status).toBe(500)
  })

  it('响应体无法解析时抛 HTTP_${status}', async () => {
    stubFetch(brokenResponse(502))

    const error = (await captureError(fetchWeatherCache(BEIJING))) as ApiError

    expect(error.code).toBe('HTTP_502')
    expect(error.status).toBe(502)
  })

  it('网络异常时抛 NETWORK_ERROR', async () => {
    stubFetchReject(new TypeError('Failed to fetch'))

    const error = (await captureError(fetchWeatherCache(BEIJING))) as ApiError

    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBe(0)
  })
})

describe('saveWeatherCache', () => {
  it('PUT /api/weather-cache，body 只带契约字段（不含 fetchedAt）', async () => {
    const fetchMock = stubFetch(jsonResponse({ cache: CACHE }))

    await expect(saveWeatherCache(BEIJING, DATA)).resolves.toEqual(CACHE)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/weather-cache')
    expect(init.method).toBe('PUT')
    expect(init.headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(init.body) as Record<string, unknown>
    expect(body).toEqual({
      location: { name: '北京', latitude: 39.9042, longitude: 116.4074 },
      data: DATA
    })
    expect('fetchedAt' in body).toBe(false)
  })

  it('传入 now 时 body 带上 fetchedAt', async () => {
    const fetchMock = stubFetch(jsonResponse({ cache: CACHE }))

    await saveWeatherCache(BEIJING, DATA, 1_700_000_000_000)

    const body = JSON.parse(fetchMock.mock.calls[0]![1].body) as Record<string, unknown>
    expect(body.fetchedAt).toBe(1_700_000_000_000)
  })

  it('服务端未返回 cache 时抛 INVALID_RESPONSE', async () => {
    stubFetch(jsonResponse({ cache: null }))

    const error = (await captureError(saveWeatherCache(BEIJING, DATA))) as ApiError
    expect(error.code).toBe('INVALID_RESPONSE')
  })

  it('400 时抛服务端错误码', async () => {
    stubFetch(jsonResponse({ error: { code: 'INVALID_BODY', message: '天气数据不完整' } }, 400))

    const error = (await captureError(saveWeatherCache(BEIJING, DATA))) as ApiError

    expect(error.code).toBe('INVALID_BODY')
    expect(error.status).toBe(400)
  })

  it('网络异常时抛 NETWORK_ERROR', async () => {
    stubFetchReject(new TypeError('Failed to fetch'))

    const error = (await captureError(saveWeatherCache(BEIJING, DATA))) as ApiError

    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBe(0)
  })
})
