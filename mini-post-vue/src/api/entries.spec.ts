import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import {
  createEntry,
  deleteEntry,
  getEntry,
  listEntries,
  setEntryLiked,
  updateEntry
} from '@/api/entries'
import type { Entry } from '@/types'

const ENTRY: Entry = {
  id: 'e1',
  content: '今天很开心',
  mood: 'happy',
  tags: ['生活'],
  likes: 3,
  liked: true,
  createdAt: 1_700_000_000_000
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

function noBodyResponse(status = 204): Response {
  return {
    ok: true,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected end of JSON input')
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

describe('listEntries', () => {
  it('GET /api/entries 并返回条目数组', async () => {
    const fetchMock = stubFetch(jsonResponse({ entries: [ENTRY] }))

    await expect(listEntries()).resolves.toEqual([ENTRY])

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/entries')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
  })

  it('透传 AbortSignal', async () => {
    const fetchMock = stubFetch(jsonResponse({ entries: [] }))
    const controller = new AbortController()

    await expect(listEntries({ signal: controller.signal })).resolves.toEqual([])
    expect(fetchMock.mock.calls[0]![1].signal).toBe(controller.signal)
  })

  it('空列表返回 []', async () => {
    stubFetch(jsonResponse({ entries: [] }))
    await expect(listEntries()).resolves.toEqual([])
  })

  it('entries 不是数组时抛 INVALID_RESPONSE（status 200）', async () => {
    stubFetch(jsonResponse({ entries: { id: 'e1' } }))

    const error = (await captureError(listEntries())) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('INVALID_RESPONSE')
    expect(error.status).toBe(200)
  })

  it('响应体不是对象时抛 INVALID_RESPONSE', async () => {
    stubFetch(jsonResponse('oops'))

    const error = (await captureError(listEntries())) as ApiError
    expect(error.code).toBe('INVALID_RESPONSE')
  })

  it('响应体无法解析时抛 INVALID_RESPONSE', async () => {
    stubFetch(brokenResponse(200))

    const error = (await captureError(listEntries())) as ApiError
    expect(error.code).toBe('INVALID_RESPONSE')
  })

  it('条目缺失字段时用安全默认值兜底', async () => {
    stubFetch(jsonResponse({ entries: [{ id: 'e9', content: '只有正文', createdAt: 5 }] }))

    await expect(listEntries()).resolves.toEqual([
      {
        id: 'e9',
        content: '只有正文',
        mood: 'calm',
        tags: [],
        likes: 0,
        liked: false,
        createdAt: 5
      }
    ])
  })

  it('likes 非法、liked 非布尔时归一', async () => {
    stubFetch(jsonResponse({ entries: [{ ...ENTRY, tags: 'x', likes: '9', liked: 'yes' }] }))

    const entries = await listEntries()

    expect(entries[0]!.tags).toEqual([])
    expect(entries[0]!.likes).toBe(0)
    expect(entries[0]!.liked).toBe(false)
  })

  it('条目不是对象时抛 INVALID_RESPONSE', async () => {
    stubFetch(jsonResponse({ entries: [null] }))

    const error = (await captureError(listEntries())) as ApiError
    expect(error.code).toBe('INVALID_RESPONSE')
  })

  it('条目缺少 id 时抛 INVALID_RESPONSE', async () => {
    stubFetch(jsonResponse({ entries: [{ content: '没有 id', createdAt: 1 }] }))

    const error = (await captureError(listEntries())) as ApiError
    expect(error.code).toBe('INVALID_RESPONSE')
  })

  it('网络异常时抛 NETWORK_ERROR', async () => {
    stubFetchReject(new TypeError('Failed to fetch'))

    const error = (await captureError(listEntries())) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBe(0)
  })

  it('AbortError 原样抛出', async () => {
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    stubFetchReject(abortError)

    const error = await captureError(listEntries())

    expect(error).toBe(abortError)
    expect(error).not.toBeInstanceOf(ApiError)
  })
})

describe('getEntry', () => {
  it('GET /api/entries/:id（id 做 URL 编码）并解析 entry', async () => {
    const fetchMock = stubFetch(jsonResponse({ entry: ENTRY }))

    await expect(getEntry('a b/c')).resolves.toEqual(ENTRY)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/entries/a%20b%2Fc')
    expect(init.method).toBe('GET')
  })

  it('缺少 entry 字段时抛 INVALID_RESPONSE', async () => {
    stubFetch(jsonResponse({ ok: true }))

    const error = (await captureError(getEntry('e1'))) as ApiError
    expect(error.code).toBe('INVALID_RESPONSE')
  })

  it('404 时抛服务端错误码', async () => {
    stubFetch(jsonResponse({ error: { code: 'NOT_FOUND', message: '条目不存在' } }, 404))

    const error = (await captureError(getEntry('nope'))) as ApiError

    expect(error.code).toBe('NOT_FOUND')
    expect(error.message).toBe('条目不存在')
    expect(error.status).toBe(404)
  })
})

describe('createEntry', () => {
  it('POST /api/entries，body 为 JSON，返回 201 的 entry', async () => {
    const fetchMock = stubFetch(jsonResponse({ entry: ENTRY }, 201))

    await expect(
      createEntry({ content: '今天很开心', mood: 'happy', tags: ['生活'] })
    ).resolves.toEqual(ENTRY)

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/entries')
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ content: '今天很开心', mood: 'happy', tags: ['生活'] })
  })

  it('400 时抛出服务端错误码', async () => {
    stubFetch(jsonResponse({ error: { code: 'INVALID_BODY', message: '正文不能为空' } }, 400))

    const error = (await captureError(createEntry({ content: '', mood: 'happy', tags: [] }))) as ApiError

    expect(error.code).toBe('INVALID_BODY')
    expect(error.status).toBe(400)
  })
})

describe('updateEntry', () => {
  it('PATCH /api/entries/:id，只发送提供的字段', async () => {
    const fetchMock = stubFetch(jsonResponse({ entry: { ...ENTRY, content: '改过了' } }))

    const entry = await updateEntry('e1', { content: '改过了' })

    expect(entry.content).toBe('改过了')

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/entries/e1')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({ content: '改过了' })
  })

  it('空 patch 时发送空对象', async () => {
    const fetchMock = stubFetch(jsonResponse({ entry: ENTRY }))

    await updateEntry('e1', {})

    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({})
  })

  it('网络异常时抛 NETWORK_ERROR', async () => {
    stubFetchReject(new TypeError('Failed to fetch'))

    const error = (await captureError(updateEntry('e1', { tags: ['生活'] }))) as ApiError
    expect(error.code).toBe('NETWORK_ERROR')
  })
})

describe('deleteEntry', () => {
  it('DELETE /api/entries/:id，204 时返回 undefined', async () => {
    const fetchMock = stubFetch(noBodyResponse(204))

    await expect(deleteEntry('e1')).resolves.toBeUndefined()

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/entries/e1')
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
  })

  it('404 时抛出 NOT_FOUND', async () => {
    stubFetch(jsonResponse({ error: { code: 'NOT_FOUND', message: '条目不存在' } }, 404))

    const error = (await captureError(deleteEntry('nope'))) as ApiError

    expect(error.code).toBe('NOT_FOUND')
    expect(error.status).toBe(404)
  })

  it('网络异常时抛 NETWORK_ERROR', async () => {
    stubFetchReject(new TypeError('Failed to fetch'))

    const error = (await captureError(deleteEntry('e1'))) as ApiError

    expect(error.code).toBe('NETWORK_ERROR')
    expect(error.status).toBe(0)
  })
})

describe('setEntryLiked', () => {
  it('PUT /api/entries/:id/like，body 为 { liked }', async () => {
    const fetchMock = stubFetch(jsonResponse({ entry: { ...ENTRY, likes: 4, liked: true } }))

    await expect(setEntryLiked('e1', true)).resolves.toEqual({ ...ENTRY, likes: 4, liked: true })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/entries/e1/like')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body)).toEqual({ liked: true })
  })

  it('取消点赞同样发送 liked: false', async () => {
    const fetchMock = stubFetch(jsonResponse({ entry: { ...ENTRY, likes: 2, liked: false } }))

    const entry = await setEntryLiked('e1', false)

    expect(entry.liked).toBe(false)
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({ liked: false })
  })

  it('服务端返回异常结构时抛 INVALID_RESPONSE', async () => {
    stubFetch(jsonResponse({ entry: null }))

    const error = (await captureError(setEntryLiked('e1', true))) as ApiError
    expect(error.code).toBe('INVALID_RESPONSE')
  })
})
