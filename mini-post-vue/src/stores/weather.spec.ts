import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fetchSettings, saveSettings } from '@/api/settings'
import { fetchWeatherCache, saveWeatherCache } from '@/api/weatherCache'
import { DEFAULT_LOCATION } from '@/constants/weather'
import { useWeatherStore } from '@/stores/weather'
import { flushPromises } from '@/test/utils'
import type { Location, WeatherCache, WeatherData } from '@/types'

vi.mock('@/api/settings', () => ({
  DEFAULT_SETTINGS: { theme: 'system', location: null },
  fetchSettings: vi.fn(),
  saveSettings: vi.fn()
}))

vi.mock('@/api/weatherCache', () => ({
  locationKey: vi.fn(
    (location: Pick<Location, 'latitude' | 'longitude'>) =>
      `${Number(location.latitude).toFixed(2)},${Number(location.longitude).toFixed(2)}`
  ),
  fetchWeatherCache: vi.fn(),
  saveWeatherCache: vi.fn()
}))

const HANGZHOU: Location = { name: '杭州', latitude: 30.2741, longitude: 120.1551, timezone: 'Asia/Shanghai' }
const DATA: WeatherData = { temperature: 12.4, apparent: 10.8, humidity: 63, code: 3 }
const T0 = new Date(2026, 10, 13, 10, 0).getTime()

const fetchSettingsMock = vi.mocked(fetchSettings)
const saveSettingsMock = vi.mocked(saveSettings)
const fetchCacheMock = vi.mocked(fetchWeatherCache)
const saveCacheMock = vi.mocked(saveWeatherCache)

function cached(data: WeatherData = DATA): WeatherCache {
  return {
    locationKey: '30.27,120.16',
    location: { name: HANGZHOU.name, latitude: HANGZHOU.latitude, longitude: HANGZHOU.longitude },
    fetchedAt: T0,
    data
  }
}

function okResponse(payload: unknown) {
  return { ok: true, status: 200, json: async () => payload } as unknown as Response
}

function weatherPayload(): unknown {
  return {
    current: {
      temperature_2m: DATA.temperature,
      apparent_temperature: DATA.apparent,
      relative_humidity_2m: DATA.humidity,
      weather_code: DATA.code
    }
  }
}

function stubFetch(impl: (url: string, init?: RequestInit) => Promise<Response>): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function stubGeolocationOk(latitude = 31.23, longitude = 121.47): void {
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    writable: true,
    value: {
      getCurrentPosition: (success: PositionCallback) => {
        success({ coords: { latitude, longitude } } as GeolocationPosition)
      }
    }
  })
}

function stubGeolocationDenied(): void {
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    writable: true,
    value: {
      getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
        error({ code: 1, message: 'denied' } as GeolocationPositionError)
      }
    }
  })
}

function removeGeolocation(): void {
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    writable: true,
    value: undefined
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  removeGeolocation()

  fetchSettingsMock.mockResolvedValue({ theme: 'system', location: null })
  saveSettingsMock.mockImplementation(async (settings) => settings)
  fetchCacheMock.mockResolvedValue(null)
  saveCacheMock.mockImplementation(async (location: Location, data: WeatherData, now?: number) => ({
    locationKey: `${Number(location.latitude).toFixed(2)},${Number(location.longitude).toFixed(2)}`,
    location: { name: location.name, latitude: location.latitude, longitude: location.longitude },
    fetchedAt: now ?? Date.now(),
    data
  }))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useWeatherStore', () => {
  describe('init', () => {
    it('有已保存城市时先渲染缓存再请求', async () => {
      fetchSettingsMock.mockResolvedValue({ theme: 'system', location: HANGZHOU })
      fetchCacheMock.mockResolvedValue(cached())
      const fetchMock = stubFetch(async () => okResponse(weatherPayload()))

      const store = useWeatherStore()
      await store.init()

      expect(fetchCacheMock).toHaveBeenCalledTimes(1)
      expect(fetchCacheMock.mock.calls[0]![0]).toEqual(HANGZHOU)
      expect(store.data).toEqual(DATA)
      expect(store.location?.name).toBe('杭州')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0]![0]).toContain('latitude=30.2741')
    })

    it('命中缓存但刷新失败时仍然展示缓存内容', async () => {
      fetchSettingsMock.mockResolvedValue({ theme: 'system', location: HANGZHOU })
      fetchCacheMock.mockResolvedValue(cached())
      stubFetch(async () => {
        throw new Error('offline')
      })

      const store = useWeatherStore()
      await store.init()

      expect(store.data).toEqual(DATA)
      expect(store.location?.name).toBe('杭州')
      expect(store.error).toBeNull()
    })

    it('没有保存城市时使用定位结果请求', async () => {
      stubGeolocationOk()
      const fetchMock = stubFetch(async () => okResponse(weatherPayload()))

      const store = useWeatherStore()
      await store.init()

      expect(store.location?.name).toBe('当前位置')
      expect(fetchMock.mock.calls[0]![0]).toContain('latitude=31.2300')
    })

    it('定位被拒绝时回退到默认城市', async () => {
      stubGeolocationDenied()
      const fetchMock = stubFetch(async () => okResponse(weatherPayload()))

      const store = useWeatherStore()
      await store.init()

      expect(store.location).toEqual(DEFAULT_LOCATION)
      expect(fetchMock.mock.calls[0]![0]).toContain('latitude=39.9042')
    })

    it('浏览器不支持定位时回退到默认城市', async () => {
      const fetchMock = stubFetch(async () => okResponse(weatherPayload()))

      const store = useWeatherStore()
      await store.init()

      expect(fetchMock.mock.calls[0]![0]).toContain('latitude=39.9042')
    })

    it('缓存过期（接口返回 null）时直接请求', async () => {
      fetchSettingsMock.mockResolvedValue({ theme: 'system', location: HANGZHOU })
      fetchCacheMock.mockResolvedValue(null)
      const fetchMock = stubFetch(async () => okResponse(weatherPayload()))

      const store = useWeatherStore()
      await store.init()

      expect(fetchCacheMock).toHaveBeenCalledTimes(1)
      expect(store.data).toEqual(DATA)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('request', () => {
    it('成功时写入数据并回写缓存', async () => {
      stubFetch(async () => okResponse(weatherPayload()))
      const store = useWeatherStore()

      await store.request(HANGZHOU)

      expect(store.data).toEqual(DATA)
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)
      expect(saveCacheMock).toHaveBeenCalledWith(HANGZHOU, DATA)
    })

    it('缓存回写失败不影响已渲染的数据', async () => {
      stubFetch(async () => okResponse(weatherPayload()))
      saveCacheMock.mockRejectedValue(new Error('cache down'))
      const store = useWeatherStore()

      await store.request(HANGZHOU)
      await flushPromises()

      expect(store.data).toEqual(DATA)
      expect(store.error).toBeNull()
      expect(store.loading).toBe(false)
    })

    it('失败且没有旧数据时给出提示文案', async () => {
      stubFetch(async () => {
        throw new Error('network down')
      })
      const store = useWeatherStore()

      await store.request(HANGZHOU)

      expect(store.data).toBeNull()
      expect(store.error).toBe('天气暂不可用')
      expect(store.loading).toBe(false)
      expect(saveCacheMock).not.toHaveBeenCalled()
    })

    it('失败但已有数据时保留旧数据且不提示', async () => {
      stubFetch(async () => okResponse(weatherPayload()))
      const store = useWeatherStore()
      await store.request(HANGZHOU)

      stubFetch(async () => {
        throw new Error('offline')
      })
      await store.request(HANGZHOU)

      expect(store.data).toEqual(DATA)
      expect(store.error).toBeNull()
    })

    it('请求进行中再次请求会排队执行', async () => {
      let resolveFirst: ((value: Response) => void) | null = null
      const fetchMock = stubFetch(async () => {
        if (!resolveFirst) {
          return new Promise<Response>((resolve) => {
            resolveFirst = resolve
          })
        }
        return okResponse(weatherPayload())
      })

      const store = useWeatherStore()
      const first = store.request(HANGZHOU)

      expect(store.loading).toBe(true)
      await store.request(DEFAULT_LOCATION)
      expect(store.pendingLocation).toEqual(DEFAULT_LOCATION)

      resolveFirst!(okResponse(weatherPayload()))
      await first
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
      await vi.waitFor(() => expect(store.location).toEqual(DEFAULT_LOCATION))

      expect(store.pendingLocation).toBeNull()
    })

    it('超时后中止请求并按失败处理', async () => {
      vi.useFakeTimers()
      stubFetch(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new Error('AbortError'))
            })
          })
      )

      const store = useWeatherStore()
      const pending = store.request(HANGZHOU)

      await vi.advanceTimersByTimeAsync(7000)
      await pending

      expect(store.error).toBe('天气暂不可用')
      expect(store.loading).toBe(false)
    })
  })

  describe('retry', () => {
    it('重试使用上次请求的城市', async () => {
      const fetchMock = stubFetch(async () => okResponse(weatherPayload()))
      const store = useWeatherStore()

      await store.request(HANGZHOU)
      await store.retry()

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock.mock.calls[1]![0]).toContain('latitude=30.2741')
    })
  })
})
