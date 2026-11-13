import { describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from '@/api/client'

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload
  } as unknown as Response
}

/** 响应体不是合法 JSON（例如网关返回 HTML 错误页） */
function brokenResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON')
    }
  } as unknown as Response
}

function noBodyResponse(status = 204): Response {
  return {
    ok: true,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input')
    }
  } as unknown as Response
}

/** 取回被抛出的异常，避免 rejects.toMatchObject 对 Error 非枚举属性不生效的坑 */
async function captureError(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('预期抛出异常，但请求成功返回')
    },
    (error: unknown) => error
  )
}

describe('apiRequest', () => {
  it('GET 默认拼接 /api 前缀，不发送 body 也不设置 Content-Type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true, uptime: 12 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/health')).resolves.toEqual({ ok: true, uptime: 12 })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/health')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers['Content-Type']).toBeUndefined()
    expect(init.headers.Accept).toBe('application/json')
  })

  it('path 不以 / 开头时自动补上', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ entries: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await apiRequest('entries')

    expect(fetchMock.mock.calls[0]![0]).toBe('/api/entries')
  })

  it('有 body 时设置 Content-Type 并 JSON 序列化', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ entry: { id: 'e1' } }, 201))
    vi.stubGlobal('fetch', fetchMock)

    const payload = { content: '今天很开心', mood: 'happy', tags: ['生活'] }
    await apiRequest('/entries', { method: 'POST', body: payload })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/entries')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify(payload))
  })

  it('透传 AbortSignal 给 fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()

    await apiRequest('/health', { signal: controller.signal })

    expect(fetchMock.mock.calls[0]![1].signal).toBe(controller.signal)
  })

  it('204 无 body 时返回 undefined', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(noBodyResponse(204)))

    await expect(apiRequest('/entries/e1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('2xx 但响应体无法解析时返回 undefined（结构校验交给调用方）', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(brokenResponse(200)))

    await expect(apiRequest('/entries')).resolves.toBeUndefined()
  })

  it('非 2xx 时抛出 ApiError，带服务端的 code / message / status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: { code: 'NOT_FOUND', message: '条目不存在' } }, 404))
    )

    const error = await captureError(apiRequest('/entries/nope'))

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).name).toBe('ApiError')
    expect((error as ApiError).code).toBe('NOT_FOUND')
    expect((error as ApiError).message).toBe('条目不存在')
    expect((error as ApiError).status).toBe(404)
  })

  it('错误体无法解析时用 HTTP_${status} 兜底', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(brokenResponse(500)))

    const error = (await captureError(apiRequest('/entries'))) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('HTTP_500')
    expect(error.message).toBe('请求失败（HTTP 500）')
    expect(error.status).toBe(500)
  })

  it('错误体缺少 code / message 时同样兜底', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: {} }, 400)))

    const error = (await captureError(apiRequest('/entries'))) as ApiError

    expect(error.code).toBe('HTTP_400')
    expect(error.message).toBe('请求失败（HTTP 400）')
    expect(error.status).toBe(400)
  })

  it('fetch 抛错（网络异常）时包装成 NETWORK_ERROR，status 为 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = (await captureError(apiRequest('/entries'))) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.message).toBe('网络连接失败，请稍后重试')
    expect(error.status).toBe(0)
  })

  it('AbortError 原样抛出，不包装成 ApiError', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

    const error = await captureError(apiRequest('/entries'))

    expect(error).toBe(abortError)
    expect(error).not.toBeInstanceOf(ApiError)
  })
})
