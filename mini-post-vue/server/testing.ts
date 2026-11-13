import { createApp } from './app.ts'
import { createStore } from './store.ts'
import type { Store } from './store.ts'

export interface JsonResult<T> {
  status: number
  body: T
  res: Response
}

export interface Harness {
  store: Store
  request(path: string, init?: RequestInit): Promise<Response>
  json<T = Record<string, unknown>>(path: string, init?: RequestInit): Promise<JsonResult<T>>
  send<T = Record<string, unknown>>(
    path: string,
    method: string,
    payload?: unknown
  ): Promise<JsonResult<T>>
}

export function createHarness(options: { now?: () => number } = {}): Harness {
  const store = createStore()
  const app = createApp(options.now ? { store, now: options.now } : { store })

  const request = (path: string, init?: RequestInit): Promise<Response> =>
    Promise.resolve(app.request(path, init))

  const json = async <T = Record<string, unknown>>(
    path: string,
    init?: RequestInit
  ): Promise<JsonResult<T>> => {
    const res = await request(path, init)
    const body = res.status === 204 ? (null as unknown as T) : ((await res.json()) as T)
    return { status: res.status, body, res }
  }

  const send = <T = Record<string, unknown>>(
    path: string,
    method: string,
    payload?: unknown
  ): Promise<JsonResult<T>> =>
    json<T>(path, {
      method,
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
      headers: { 'Content-Type': 'application/json' }
    })

  return { store, request, json, send }
}

/** 手动推进的时钟（毫秒） */
export function createClock(start = 1_700_000_000_000) {
  let current = start
  return {
    now: (): number => current,
    set(ms: number): void {
      current = ms
    },
    advance(ms: number): number {
      current += ms
      return current
    }
  }
}

/** 每次读取自增的时钟，用于制造 createdAt 差异 */
export function createSteppingClock(start = 1_700_000_000_000, step = 1000) {
  let current = start - step
  return {
    now: (): number => {
      current += step
      return current
    }
  }
}
