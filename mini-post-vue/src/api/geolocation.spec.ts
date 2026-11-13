import { describe, expect, it, vi } from 'vitest'
import { getCurrentLocation, isGeolocationSupported } from '@/api/geolocation'

function stubGeolocation(getCurrentPosition: unknown): void {
  Object.defineProperty(window.navigator, 'geolocation', {
    configurable: true,
    writable: true,
    value: { getCurrentPosition }
  })
}

describe('isGeolocationSupported', () => {
  it('浏览器提供 geolocation 时为 true', () => {
    stubGeolocation(vi.fn())

    expect(isGeolocationSupported()).toBe(true)
  })

  it('缺少 geolocation 时为 false', () => {
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      writable: true,
      value: undefined
    })

    expect(isGeolocationSupported()).toBe(false)
  })
})

describe('getCurrentLocation', () => {
  it('成功时返回经纬度', async () => {
    stubGeolocation((success: PositionCallback) => {
      success({ coords: { latitude: 31.23, longitude: 121.47 } } as GeolocationPosition)
    })

    await expect(getCurrentLocation()).resolves.toEqual({ latitude: 31.23, longitude: 121.47 })
  })

  it('使用 8 秒超时与 10 分钟缓存', async () => {
    const getCurrentPosition = vi.fn()
    stubGeolocation(getCurrentPosition)

    void getCurrentLocation().catch(() => undefined)

    expect(getCurrentPosition.mock.calls[0]![2]).toEqual({ timeout: 8000, maximumAge: 10 * 60 * 1000 })
  })

  it('拒绝授权时抛错', async () => {
    stubGeolocation((_success: PositionCallback, error: PositionErrorCallback) => {
      error({ code: 1, message: 'denied' } as GeolocationPositionError)
    })

    await expect(getCurrentLocation()).rejects.toThrow('denied')
  })

  it('不支持定位时直接抛错', async () => {
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      writable: true,
      value: undefined
    })

    await expect(getCurrentLocation()).rejects.toThrow()
  })
})
