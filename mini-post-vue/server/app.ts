import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createStore } from './store.ts'
import {
  isWeatherCacheFresh,
  locationKeyOf,
  normalizeSettings,
  parseCreateEntry,
  parseJsonObject,
  parseLike,
  parseUpdateEntry,
  parseWeatherCacheInput
} from './validate.ts'
import type { Store } from './store.ts'
import type { ErrorCode, ValidationResult } from './validate.ts'
import type { Context } from 'hono'
import type { Entry, WeatherCache } from '../src/types/index.ts'

export interface AppOptions {
  /** 注入自定义存储，便于测试隔离；缺省使用全新的内存存储 */
  store?: Store
  /** 毫秒时钟，默认 Date.now；测试可注入 */
  now?: () => number
}

const ERROR_STATUS: Record<ErrorCode, 400 | 404 | 500> = {
  INVALID_BODY: 400,
  EMPTY_CONTENT: 400,
  CONTENT_TOO_LONG: 400,
  INVALID_MOOD: 400,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500
}

function sendError(c: Context, code: ErrorCode, message: string): Response {
  return c.json({ error: { code, message } }, ERROR_STATUS[code])
}

function sendValidationError(c: Context, result: { code: ErrorCode; message: string }): Response {
  return sendError(c, result.code, result.message)
}

async function readBody(c: Context): Promise<ValidationResult<Record<string, unknown>>> {
  let raw: string
  try {
    raw = await c.req.text()
  } catch {
    return { ok: false, code: 'INVALID_BODY', message: '请求体读取失败' }
  }
  return parseJsonObject(raw)
}

export function createApp(options: AppOptions = {}): Hono {
  const store = options.store ?? createStore()
  const now = options.now ?? ((): number => Date.now())
  const startedAt = now()

  const app = new Hono()

  app.use(
    '/api/*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type']
    })
  )

  app.get('/api/health', (c) => c.json({ ok: true, uptime: Math.max(0, now() - startedAt) / 1000 }))

  app.get('/api/entries', (c) => c.json({ entries: store.listEntries() }))

  app.post('/api/entries', async (c) => {
    const body = await readBody(c)
    if (!body.ok) return sendValidationError(c, body)

    const input = parseCreateEntry(body.value)
    if (!input.ok) return sendValidationError(c, input)

    const entry: Entry = {
      id: crypto.randomUUID(),
      content: input.value.content,
      mood: input.value.mood,
      tags: input.value.tags,
      likes: 0,
      liked: false,
      createdAt: now()
    }
    store.insertEntry(entry)
    return c.json({ entry }, 201)
  })

  app.get('/api/entries/:id', (c) => {
    const entry = store.getEntry(c.req.param('id'))
    if (!entry) return sendError(c, 'NOT_FOUND', '记录不存在')
    return c.json({ entry })
  })

  app.patch('/api/entries/:id', async (c) => {
    const body = await readBody(c)
    if (!body.ok) return sendValidationError(c, body)

    const input = parseUpdateEntry(body.value)
    if (!input.ok) return sendValidationError(c, input)

    const updated = store.patchEntry(c.req.param('id'), input.value)
    if (!updated) return sendError(c, 'NOT_FOUND', '记录不存在')
    return c.json({ entry: updated })
  })

  app.delete('/api/entries/:id', (c) => {
    if (!store.removeEntry(c.req.param('id'))) return sendError(c, 'NOT_FOUND', '记录不存在')
    return c.body(null, 204)
  })

  app.put('/api/entries/:id/like', async (c) => {
    const body = await readBody(c)
    if (!body.ok) return sendValidationError(c, body)

    const liked = parseLike(body.value)
    if (!liked.ok) return sendValidationError(c, liked)

    const id = c.req.param('id')
    const current = store.getEntry(id)
    if (!current) return sendError(c, 'NOT_FOUND', '记录不存在')

    // 幂等：仅当 liked 真正翻转时才变动 likes，且下限 0
    if (current.liked === liked.value) return c.json({ entry: current })

    const updated = store.patchEntry(id, {
      liked: liked.value,
      likes: Math.max(0, current.likes + (liked.value ? 1 : -1))
    })
    if (!updated) return sendError(c, 'NOT_FOUND', '记录不存在')
    return c.json({ entry: updated })
  })

  app.get('/api/settings', (c) => c.json({ settings: store.readSettings() }))

  app.put('/api/settings', async (c) => {
    const body = await readBody(c)
    if (!body.ok) return sendValidationError(c, body)
    return c.json({ settings: store.writeSettings(normalizeSettings(body.value)) })
  })

  app.get('/api/weather-cache', (c) => {
    const cache = store.readWeatherCache()
    if (!cache) return c.json({ cache: null })
    if (!isWeatherCacheFresh(cache, now())) return c.json({ cache: null })

    const expectedKey = c.req.query('locationKey')
    if (expectedKey && cache.locationKey !== expectedKey) return c.json({ cache: null })
    return c.json({ cache })
  })

  app.put('/api/weather-cache', async (c) => {
    const body = await readBody(c)
    if (!body.ok) return sendValidationError(c, body)

    const input = parseWeatherCacheInput(body.value)
    if (!input.ok) return sendValidationError(c, input)

    const cache: WeatherCache = {
      locationKey: locationKeyOf(input.value.location),
      location: input.value.location,
      fetchedAt: input.value.fetchedAt ?? now(),
      data: input.value.data
    }
    return c.json({ cache: store.writeWeatherCache(cache) })
  })

  app.notFound((c) => sendError(c, 'NOT_FOUND', '接口不存在'))

  app.onError((error, c) => {
    console.error('[api] unexpected error:', error)
    return sendError(c, 'INTERNAL_ERROR', '服务器内部错误')
  })

  return app
}
