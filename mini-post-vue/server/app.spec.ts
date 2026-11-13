import { describe, expect, it } from 'vitest'
import { createClock, createHarness } from './testing.ts'

describe('GET /api/health', () => {
  it('返回 ok 与秒级 uptime', async () => {
    const clock = createClock()
    const api = createHarness({ now: clock.now })

    const first = await api.json<{ ok: boolean; uptime: number }>('/api/health')
    expect(first.status).toBe(200)
    expect(first.body.ok).toBe(true)
    expect(typeof first.body.uptime).toBe('number')

    clock.advance(5000)
    const second = await api.json<{ ok: boolean; uptime: number }>('/api/health')
    expect(second.body.uptime - first.body.uptime).toBeCloseTo(5, 5)
  })
})

describe('CORS', () => {
  it('OPTIONS 预检允许任意来源', async () => {
    const api = createHarness()
    const res = await api.request('/api/entries', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST'
      }
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })

  it('普通响应带 allow-origin: *', async () => {
    const api = createHarness()
    const res = await api.request('/api/entries', { headers: { Origin: 'http://x.test' } })
    expect(res.headers.get('access-control-allow-origin')).toBe('*')
  })
})

describe('未知路由', () => {
  it('未知 /api/* 返回 404 NOT_FOUND', async () => {
    const api = createHarness()
    const res = await api.json<{ error: { code: string } }>('/api/unknown')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })

  it('未知非 api 路由返回 404 NOT_FOUND', async () => {
    const api = createHarness()
    const res = await api.json<{ error: { code: string } }>('/whatever')
    expect(res.status).toBe(404)
    expect(res.body.error.code).toBe('NOT_FOUND')
  })
})

describe('未捕获异常', () => {
  it('通过 onError 返回 500 INTERNAL_ERROR', async () => {
    const api = createHarness()
    api.store.listEntries = () => {
      throw new Error('boom')
    }
    const res = await api.json<{ error: { code: string; message: string } }>('/api/entries')
    expect(res.status).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
  })
})
