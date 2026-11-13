/**
 * 统一的 REST 访问层。
 * - 只依赖原生 fetch，不引入 axios。
 * - path 以 '/' 开头，内部拼成 '/api' + path（dev / preview 由 vite 代理到本地 Hono 服务）。
 * - 非 2xx 统一抛出 ApiError，错误体形如 { error: { code, message } }。
 * - AbortError 原样抛出，因为调用方用 abort 取消请求，不是业务错误。
 */

/** 服务端 API 前缀，与 vite.config.ts 里的代理规则保持一致 */
const API_BASE = '/api'

const NETWORK_ERROR_MESSAGE = '网络连接失败，请稍后重试'

export class ApiError extends Error {
  /** 服务端业务错误码，如 'NOT_FOUND' / 'INVALID_BODY'；网络层失败为 'NETWORK_ERROR' */
  readonly code: string
  /** HTTP 状态码；网络层失败（连不上、DNS、CORS 等）为 0 */
  readonly status: number

  constructor(code: string, message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function readString(source: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = source?.[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
  )
}

/** 读取 JSON 响应体；空 body 或非法 JSON 一律返回 undefined，交给调用方做结构校验 */
async function readJsonBody(response: Response): Promise<unknown> {
  if (typeof response.json !== 'function') return undefined

  try {
    return (await response.json()) as unknown
  } catch {
    return undefined
  }
}

/** 把非 2xx 响应（含解析失败的兜底）转成 ApiError */
async function buildApiError(response: Response): Promise<ApiError> {
  const payload = await readJsonBody(response)
  const detail = toRecord(toRecord(payload)?.error)

  const code = readString(detail, 'code') ?? `HTTP_${response.status}`
  const message = readString(detail, 'message') ?? `请求失败（HTTP ${response.status}）`

  return new ApiError(code, message, response.status)
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options

  const headers: Record<string, string> = { Accept: 'application/json' }
  const init: RequestInit = { method, headers }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  if (signal) init.signal = signal

  let response: Response
  try {
    response = await fetch(`${API_BASE}${normalizePath(path)}`, init)
  } catch (error) {
    // 调用方主动取消：必须原样抛出，不能被包成 ApiError
    if (isAbortError(error)) throw error
    throw new ApiError('NETWORK_ERROR', NETWORK_ERROR_MESSAGE, 0)
  }

  // 204 没有响应体（DELETE 的常见返回）
  if (response.status === 204) return undefined as unknown as T

  if (!response.ok) throw await buildApiError(response)

  return (await readJsonBody(response)) as T
}
