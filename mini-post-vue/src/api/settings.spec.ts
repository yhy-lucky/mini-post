import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { DEFAULT_SETTINGS, fetchSettings, saveSettings } from '@/api/settings'
import type { AppSettings } from '@/types'

const SETTINGS: AppSettings = {
  theme: 'dark',
  location: {
    name: '北京',
    latitude: 39.9042,
    longitude: 116.4074,
    timezone: 'Asia/Shanghai'
  }
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

describe('DEFAULT_SETTINGS', () => {
  it('默认主题 system、无城市', () => {
    expect(DEFAULT_SETTINGS).toEqual({ theme: 'system', location: null })
  })
})

describe('fetchSettings', () => {
  it('GET /api/settings 并解析设置', async () => {
    const fetchMock = stubFetch(jsonResponse({ settings: SETTINGS }))

    await expect(fetchSettings()).resolves.toEqual(SETTINGS)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/settings')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
  })

  it('透传 AbortSignal', async () => {
    const fetchMock = stubFetch(jsonResponse({ settings: DEFAULT_SETTINGS }))
    const controller = new AbortController()

    await fetchSettings({ signal: controller.signal })

    expect(fetchMock.mock.calls[0]![1].signal).toBe(controller.signal)
  })

  it('非法 theme 回退 system', async () => {
    stubFetch(jsonResponse({ settings: { theme: 'rainbow', location: null } }))

    await expect(fetchSettings()).resolves.toEqual({ theme: 'system', location: null })
  })

  it('location 缺少经纬度时回退 null', async () => {
    stubFetch(jsonResponse({ settings: { theme: 'light', location: { name: '北京' } } }))

    await expect(fetchSettings()).resolves.toEqual({ theme: 'light', location: null })
  })

  it('location 缺 name / timezone 时用默认值补齐', async () => {
    stubFetch(jsonResponse({ settings: { theme: 'dark', location: { latitude: 1, longitude: 2 } } }))

    await expect(fetchSettings()).resolves.toEqual({
      theme: 'dark',
      location: { name: '当前位置', latitude: 1, longitude: 2, timezone: 'Asia/Shanghai' }
    })
  })

  it('settings 为空对象时给出默认值', async () => {
    stubFetch(jsonResponse({ settings: {} }))

    await expect(fetchSettings()).resolves.toEqual({ theme: 'system', location: null })
  })

  it('缺少 settings 字段时抛 INVALID_RESPONSE（status 200）', async () => {
    stubFetch(jsonResponse({ theme: 'dark' }))

    const error = (await captureError(fetchSettings())) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('INVALID_RESPONSE')
    expect(error.status).toBe(200)
  })

  it('settings 为 null 时抛 INVALID_RESPONSE', async () => {
    stubFetch(jsonResponse({ settings: null }))

    const error = (await captureError(fetchSettings())) as ApiError
    expect(error.code).toBe('INVALID_RESPONSE')
  })

  it('响应体不是对象时抛 INVALID_RESPONSE', async () => {
    stubFetch(jsonResponse('oops'))

    const error = (await captureError(fetchSettings())) as ApiError
    expect(error.code).toBe('INVALID_RESPONSE')
  })

  it('500 时抛服务端错误码', async () => {
    stubFetch(jsonResponse({ error: { code: 'INTERNAL_ERROR', message: '服务器开小差了' } }, 500))

    const error = (await captureError(fetchSettings())) as ApiError

    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.status).toBe(500)
  })

  it('响应体无法解析时抛 HTTP_${status}', async () => {
    stubFetch(brokenResponse(503))

    const error = (await captureError(fetchSettings())) as ApiError

    expect(error.code).toBe('HTTP_503')
    expect(error.status).toBe(503)
  })

  it('网络异常时抛 NETWORK_ERROR', async () => {
    stubFetchReject(new TypeError('Failed to fetch'))

    const error = (await captureError(fetchSettings())) as ApiError

    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBe(0)
  })

  it('AbortError 原样抛出', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    stubFetchReject(abortError)

    const error = await captureError(fetchSettings())

    expect(error).toBe(abortError)
    expect(error).not.toBeInstanceOf(ApiError)
  })
})

describe('saveSettings', () => {
  it('PUT /api/settings，body 为完整设置', async () => {
    const fetchMock = stubFetch(jsonResponse({ settings: SETTINGS }))

    await expect(saveSettings(SETTINGS)).resolves.toEqual(SETTINGS)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/settings')
    expect(init.method).toBe('PUT')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual(SETTINGS)
  })

  it('保存 theme = system 且无城市', async () => {
    const fetchMock = stubFetch(jsonResponse({ settings: { theme: 'system', location: null } }))

    await expect(saveSettings({ theme: 'system', location: null })).resolves.toEqual({
      theme: 'system',
      location: null
    })
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ theme: 'system', location: null })
  })

  it('返回的设置同样会被规范化', async () => {
    stubFetch(jsonResponse({ settings: { theme: 'rainbow', location: { name: '上海' } } }))

    await expect(saveSettings(SETTINGS)).resolves.toEqual({ theme: 'system', location: null })
  })

  it('服务端未返回 settings 时抛 INVALID_RESPONSE', async () => {
    stubFetch(jsonResponse({ ok: true }))

    const error = (await captureError(saveSettings(SETTINGS))) as ApiError
    expect(error.code).toBe('INVALID_RESPONSE')
  })

  it('400 时抛服务端错误码', async () => {
    stubFetch(jsonResponse({ error: { code: 'INVALID_BODY', message: '设置格式不正确' } }, 400))

    const error = (await captureError(saveSettings(SETTINGS))) as ApiError

    expect(error.code).toBe('INVALID_BODY')
    expect(error.status).toBe(400)
  })

  it('网络异常时抛 NETWORK_ERROR', async () => {
    stubFetchReject(new TypeError('Failed to fetch'))

    const error = (await captureError(saveSettings(SETTINGS))) as ApiError
    expect(error.code).toBe('NETWORK_ERROR')
  })
})
