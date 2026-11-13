import { describe, expect, it } from 'vitest'
import { MAX_LEN, MAX_TAGS } from '../src/constants/tags.ts'
import { createHarness, createSteppingClock } from './testing.ts'
import type { Entry } from '../src/types/index.ts'

type EntryBody = { entry: Entry }
type EntriesBody = { entries: Entry[] }
type ErrorBody = { error: { code: string; message: string } }

const base = { content: '今天很好', mood: 'happy', tags: ['工作'] }

describe('POST /api/entries', () => {
  it('创建成功返回 201 与服务端生成字段', async () => {
    const api = createHarness()
    const res = await api.send<EntryBody>('/api/entries', 'POST', base)

    expect(res.status).toBe(201)
    expect(res.body.entry.id).toMatch(/^[0-9a-f-]{36}$/i)
    expect(res.body.entry).toMatchObject({
      content: '今天很好',
      mood: 'happy',
      tags: ['工作'],
      likes: 0,
      liked: false
    })
    expect(typeof res.body.entry.createdAt).toBe('number')
  })

  it('content 先 trim', async () => {
    const api = createHarness()
    const res = await api.send<EntryBody>('/api/entries', 'POST', { ...base, content: '  空格内容  ' })
    expect(res.body.entry.content).toBe('空格内容')
  })

  it('tags 去空去重 trim 并截断到 MAX_TAGS', async () => {
    const api = createHarness()
    const res = await api.send<EntryBody>('/api/entries', 'POST', {
      ...base,
      tags: ['  工作 ', '工作', '', '   ', '学习', '生活', '运动', '多出来的']
    })
    expect(res.body.entry.tags).toEqual(['工作', '学习', '生活'])
    expect(res.body.entry.tags).toHaveLength(MAX_TAGS)
  })

  it('tags 非数组时回落为空数组且忽略非字符串项', async () => {
    const api = createHarness()
    const res = await api.send<EntryBody>('/api/entries', 'POST', { ...base, tags: 'not-an-array' })
    expect(res.body.entry.tags).toEqual([])

    const res2 = await api.send<EntryBody>('/api/entries', 'POST', {
      ...base,
      tags: ['工作', 42, null, '学习']
    })
    expect(res2.body.entry.tags).toEqual(['工作', '学习'])
  })

  it('content 为空白 → 400 EMPTY_CONTENT', async () => {
    const api = createHarness()
    const res = await api.send<ErrorBody>('/api/entries', 'POST', { ...base, content: '   ' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('EMPTY_CONTENT')
  })

  it('content 超过 MAX_LEN → 400 CONTENT_TOO_LONG', async () => {
    const api = createHarness()
    const res = await api.send<ErrorBody>('/api/entries', 'POST', {
      ...base,
      content: 'a'.repeat(MAX_LEN + 1)
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('CONTENT_TOO_LONG')
  })

  it('按码点计数：MAX_LEN 个 emoji 合法', async () => {
    const api = createHarness()
    const res = await api.send<EntryBody>('/api/entries', 'POST', {
      ...base,
      content: '🙂'.repeat(MAX_LEN)
    })
    expect(res.status).toBe(201)
  })

  it('mood 非法 → 400 INVALID_MOOD', async () => {
    const api = createHarness()
    const res = await api.send<ErrorBody>('/api/entries', 'POST', { ...base, mood: 'angry' })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_MOOD')
  })

  it('非法 JSON → 400 INVALID_BODY', async () => {
    const api = createHarness()
    const res = await api.json<ErrorBody>('/api/entries', {
      method: 'POST',
      body: '{not json',
      headers: { 'Content-Type': 'application/json' }
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_BODY')
  })

  it('JSON 数组 → 400 INVALID_BODY', async () => {
    const api = createHarness()
    const res = await api.send<ErrorBody>('/api/entries', 'POST', [1, 2, 3])
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_BODY')
  })
})

describe('GET /api/entries', () => {
  it('初始为空数组', async () => {
    const api = createHarness()
    const res = await api.json<EntriesBody>('/api/entries')
    expect(res.status).toBe(200)
    expect(res.body.entries).toEqual([])
  })

  it('按 createdAt 倒序返回', async () => {
    const api = createHarness({ now: createSteppingClock().now })
    await api.send('/api/entries', 'POST', { ...base, content: '第一条' })
    await api.send('/api/entries', 'POST', { ...base, content: '第二条' })
    await api.send('/api/entries', 'POST', { ...base, content: '第三条' })

    const res = await api.json<EntriesBody>('/api/entries')
    expect(res.body.entries.map((entry) => entry.content)).toEqual(['第三条', '第二条', '第一条'])
  })
})

describe('GET /api/entries/:id', () => {
  it('命中返回记录', async () => {
    const api = createHarness()
    const created = await api.send<EntryBody>('/api/entries', 'POST', base)
    const res = await api.json<EntryBody>(`/api/entries/${created.body.entry.id}`)
    expect(res.status).toBe(200)
    expect(res.body.entry.id).toBe(created.body.entry.id)
  })

  it('不存在 → 404 NOT_FOUND', async () => {
    const api = createHarness()
    const res = await api.json<ErrorBody>('/api/entries/nope')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})

describe('PATCH /api/entries/:id', () => {
  it('可局部更新 content / mood / tags', async () => {
    const api = createHarness()
    const created = await api.send<EntryBody>('/api/entries', 'POST', base)
    const res = await api.send<EntryBody>(`/api/entries/${created.body.entry.id}`, 'PATCH', {
      content: '  改过  ',
      mood: 'sad',
      tags: ['旅行', '旅行', '音乐']
    })
    expect(res.status).toBe(200)
    expect(res.body.entry).toMatchObject({ content: '改过', mood: 'sad', tags: ['旅行', '音乐'] })
  })

  it('空 body → 400 INVALID_BODY', async () => {
    const api = createHarness()
    const created = await api.send<EntryBody>('/api/entries', 'POST', base)
    const res = await api.send<ErrorBody>(`/api/entries/${created.body.entry.id}`, 'PATCH', {})
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_BODY')
  })

  it('非法 mood → 400 INVALID_MOOD', async () => {
    const api = createHarness()
    const created = await api.send<EntryBody>('/api/entries', 'POST', base)
    const res = await api.send<ErrorBody>(`/api/entries/${created.body.entry.id}`, 'PATCH', {
      mood: 'xx'
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_MOOD')
  })

  it('不存在 → 404 NOT_FOUND', async () => {
    const api = createHarness()
    const res = await api.send<ErrorBody>('/api/entries/nope', 'PATCH', { content: 'x' })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})

describe('DELETE /api/entries/:id', () => {
  it('删除返回 204 且无响应体，随后 GET 404', async () => {
    const api = createHarness()
    const created = await api.send<EntryBody>('/api/entries', 'POST', base)
    const res = await api.request(`/api/entries/${created.body.entry.id}`, { method: 'DELETE' })
    expect(res.status).toBe(204)
    expect(await res.text()).toBe('')

    const after = await api.json<ErrorBody>(`/api/entries/${created.body.entry.id}`)
    expect(after.status).toBe(404)
  })

  it('不存在 → 404 NOT_FOUND', async () => {
    const api = createHarness()
    const res = await api.json<ErrorBody>('/api/entries/nope', { method: 'DELETE' })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})

describe('PUT /api/entries/:id/like', () => {
  it('连续两次 {liked:true} 计数不变（幂等）', async () => {
    const api = createHarness()
    const created = await api.send<EntryBody>('/api/entries', 'POST', base)
    const first = await api.send<EntryBody>(`/api/entries/${created.body.entry.id}/like`, 'PUT', {
      liked: true
    })
    const second = await api.send<EntryBody>(`/api/entries/${created.body.entry.id}/like`, 'PUT', {
      liked: true
    })

    expect(first.body.entry).toMatchObject({ liked: true, likes: 1 })
    expect(second.body.entry).toMatchObject({ liked: true, likes: 1 })
  })

  it('取消点赞回到 0，再次取消不低于 0', async () => {
    const api = createHarness()
    const created = await api.send<EntryBody>('/api/entries', 'POST', base)
    const id = created.body.entry.id

    await api.send(`/api/entries/${id}/like`, 'PUT', { liked: true })
    const off = await api.send<EntryBody>(`/api/entries/${id}/like`, 'PUT', { liked: false })
    const again = await api.send<EntryBody>(`/api/entries/${id}/like`, 'PUT', { liked: false })

    expect(off.body.entry).toMatchObject({ liked: false, likes: 0 })
    expect(again.body.entry).toMatchObject({ liked: false, likes: 0 })
  })

  it('liked 非 boolean → 400 INVALID_BODY', async () => {
    const api = createHarness()
    const created = await api.send<EntryBody>('/api/entries', 'POST', base)
    const res = await api.send<ErrorBody>(`/api/entries/${created.body.entry.id}/like`, 'PUT', {
      liked: 'yes'
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_BODY')
  })

  it('不存在 → 404 NOT_FOUND', async () => {
    const api = createHarness()
    const res = await api.send<ErrorBody>('/api/entries/nope/like', 'PUT', { liked: true })
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})
