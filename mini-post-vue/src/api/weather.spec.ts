import { describe, expect, it, vi } from 'vitest'
import { fetchCurrentWeather, searchCities, weatherInfo } from '@/api/weather'
import type { Location } from '@/types'

const BEIJING: Location = { name: '北京', latitude: 39.9042, longitude: 116.4074, timezone: 'Asia/Shanghai' }

function okResponse(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as unknown as Response
}

function failResponse(status = 500): Response {
  return { ok: false, status, json: async () => ({}) } as unknown as Response
}

describe('weatherInfo', () => {
  it.each([
    [0, 'sun', '晴'],
    [1, 'partly', '晴间多云'],
    [2, 'partly', '多云'],
    [3, 'cloud', '阴'],
    [45, 'fog', '有雾'],
    [48, 'fog', '有雾'],
    [51, 'drizzle', '毛毛雨'],
    [57, 'drizzle', '毛毛雨'],
    [61, 'rain', '下雨'],
    [67, 'rain', '下雨'],
    [71, 'snow', '下雪'],
    [77, 'snow', '下雪'],
    [80, 'rain', '阵雨'],
    [82, 'rain', '阵雨'],
    [85, 'snow', '阵雪'],
    [86, 'snow', '阵雪'],
    [95, 'thunder', '雷雨'],
    [99, 'thunder', '雷雨'],
    [4, 'cloud', '多云']
  ])('code %i → %s / %s', (code, key, text) => {
    expect(weatherInfo(code)).toEqual({ key, text })
  })
})

describe('fetchCurrentWeather', () => {
  it('拼装正确的请求地址', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ current: { temperature_2m: 1 } }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchCurrentWeather(BEIJING)

    const url = fetchMock.mock.calls[0]![0] as string
    expect(url.startsWith('https://api.open-meteo.com/v1/forecast?')).toBe(true)
    expect(url).toContain('latitude=39.9042')
    expect(url).toContain('longitude=116.4074')
    expect(url).toContain('current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code')
    expect(url).toContain('timezone=Asia%2FShanghai')
  })

  it('解析响应中的当前天气', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        okResponse({
          current: { temperature_2m: 12.4, apparent_temperature: 10.8, relative_humidity_2m: 63, weather_code: 3 }
        })
      )
    )

    await expect(fetchCurrentWeather(BEIJING)).resolves.toEqual({
      temperature: 12.4,
      apparent: 10.8,
      humidity: 63,
      code: 3
    })
  })

  it('缺失的可选字段使用安全默认值', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ current: { temperature_2m: 7 } })))

    await expect(fetchCurrentWeather(BEIJING)).resolves.toEqual({
      temperature: 7,
      apparent: 7,
      humidity: 0,
      code: 3
    })
  })

  it('时间戳缺省为北京时间', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ current: { temperature_2m: 1 } }))
    vi.stubGlobal('fetch', fetchMock)

    await fetchCurrentWeather({ ...BEIJING, timezone: '' })

    expect(fetchMock.mock.calls[0]![0]).toContain('timezone=Asia%2FShanghai')
  })

  it('HTTP 状态异常时抛错', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failResponse(502)))

    await expect(fetchCurrentWeather(BEIJING)).rejects.toThrow('502')
  })

  it('payload 缺少温度时抛错', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({ current: {} })))
    await expect(fetchCurrentWeather(BEIJING)).rejects.toThrow()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(null)))
    await expect(fetchCurrentWeather(BEIJING)).rejects.toThrow()
  })

  it('把 signal 透传给 fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse({ current: { temperature_2m: 1 } }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await fetchCurrentWeather(BEIJING, { signal: controller.signal })

    expect(fetchMock.mock.calls[0]![1]).toEqual({ signal: controller.signal })
  })
})

describe('searchCities', () => {
  it('拼装地理编码请求并返回结果', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({ results: [{ name: '杭州', latitude: 30.27, longitude: 120.16, admin1: '浙江省', country: '中国' }] })
    )
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchCities('杭州')

    const url = fetchMock.mock.calls[0]![0] as string
    expect(url.startsWith('https://geocoding-api.open-meteo.com/v1/search?')).toBe(true)
    expect(url).toContain('count=5')
    expect(url).toContain('language=zh')
    expect(url).toContain('format=json')
    expect(results).toEqual([
      { name: '杭州', latitude: 30.27, longitude: 120.16, admin1: '浙江省', country: '中国' }
    ])
  })

  it('没有搜索结果时返回空数组', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse({})))

    await expect(searchCities('不存在的地方')).resolves.toEqual([])
  })

  it('HTTP 状态异常时抛错', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failResponse(503)))

    await expect(searchCities('杭州')).rejects.toThrow('503')
  })

  it('「长沙」合并「长沙市」结果，湖南长沙市排第一', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(`name=${encodeURIComponent('长沙市')}`)) {
        return okResponse({
          results: [
            {
              id: 9,
              name: '长沙市',
              latitude: 28.19874,
              longitude: 112.97087,
              admin1: '湖南',
              country: '中国',
              population: 3093980,
              feature_code: 'PPLA',
              timezone: 'Asia/Shanghai'
            }
          ]
        })
      }
      return okResponse({
        results: [
          { id: 1, name: '长沙', latitude: 30.99997, longitude: 108.30463, admin1: '重庆市', country: '中国', population: 47170, feature_code: 'PPLA4' },
          { id: 2, name: '长沙', latitude: 28.68778, longitude: 105.98972, admin1: '贵州', country: '中国', population: 1653, feature_code: 'PPLA4' }
        ]
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchCities('长沙')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(results[0]).toMatchObject({ name: '长沙市', admin1: '湖南', latitude: 28.19874 })
    expect(results.map((item) => item.admin1)).toEqual(['湖南', '重庆市', '贵州'])
  })

  it('「湖南长沙」剥掉省名后仍能找到湖南长沙市', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(`name=${encodeURIComponent('长沙市')}`)) {
        return okResponse({
          results: [{ id: 9, name: '长沙市', latitude: 28.19874, longitude: 112.97087, admin1: '湖南', population: 3093980, feature_code: 'PPLA' }]
        })
      }
      return okResponse({})
    })
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchCities('湖南长沙')

    expect(fetchMock.mock.calls.map((call) => String(call[0]))).not.toContain(
      expect.stringContaining(`name=${encodeURIComponent('湖南长沙')}`)
    )
    expect(results[0]).toMatchObject({ name: '长沙市', admin1: '湖南' })
  })

  it('英文关键词只发一次请求', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okResponse({ results: [{ name: '长沙市', latitude: 28.19874, longitude: 112.97087, admin1: '湖南' }] })
    )
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchCities('Changsha')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(results[0]!.admin1).toBe('湖南')
  })

  it('其中一路失败时仍返回另一路结果', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes(`name=${encodeURIComponent('长沙市')}`)) return failResponse(503)
      return okResponse({
        results: [{ id: 1, name: '长沙', latitude: 30.99997, longitude: 108.30463, admin1: '重庆市', population: 47170 }]
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const results = await searchCities('长沙')

    expect(results).toHaveLength(1)
    expect(results[0]!.admin1).toBe('重庆市')
  })

  it('取消请求时把 AbortError 透传给调用方', async () => {
    const abortError = new DOMException('aborted', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

    await expect(searchCities('长沙')).rejects.toBe(abortError)
  })
})
