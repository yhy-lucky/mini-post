/**
 * 条目（Entry）相关的 REST 调用。
 * 这里只做「轻量结构校验 + 安全默认值」，业务规则（长度、心情合法性、标签数量）由服务端负责。
 */

import { ApiError, apiRequest } from '@/api/client'
import { getMood } from '@/constants/moods'
import type { Entry, MoodId } from '@/types'

/** 响应已成功（2xx）但结构不对，属于「服务端返回异常」而不是网络失败 */
const INVALID_RESPONSE_STATUS = 200

function invalidResponse(message: string): ApiError {
  return new ApiError('INVALID_RESPONSE', message, INVALID_RESPONSE_STATUS)
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((tag): tag is string => typeof tag === 'string')
}

function normalizeLikes(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
}

function normalizeTime(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * 把服务端返回的任意数据归一为 Entry。
 * 只有 id 是硬性要求（后续 update / delete / like 都要用它），其余字段缺失时给安全默认值。
 */
function normalizeEntry(raw: unknown): Entry {
  const item = toRecord(raw)
  if (!item) throw invalidResponse('服务端返回的条目不是对象')

  const id = item.id
  if (typeof id !== 'string' || id === '') throw invalidResponse('服务端返回的条目缺少 id')

  return {
    id,
    content: typeof item.content === 'string' ? item.content : '',
    // 未知心情回退到「平静」，与旧 localStorage 迁移逻辑保持一致
    mood: getMood(typeof item.mood === 'string' ? item.mood : null).id,
    tags: normalizeTags(item.tags),
    likes: normalizeLikes(item.likes),
    liked: item.liked === true,
    createdAt: normalizeTime(item.createdAt)
  }
}

/** 取 { entry: Entry } 响应体里的条目 */
function pickEntry(payload: unknown): Entry {
  const container = toRecord(payload)
  if (!container) throw invalidResponse('服务端返回的数据不是对象')
  if (!('entry' in container)) throw invalidResponse('服务端返回的数据缺少 entry 字段')

  return normalizeEntry(container.entry)
}

const entryPath = (id: string): string => `/entries/${encodeURIComponent(id)}`

/** GET /api/entries（createdAt 倒序由服务端保证） */
export async function listEntries(options: { signal?: AbortSignal } = {}): Promise<Entry[]> {
  const payload = await apiRequest<unknown>('/entries', { signal: options.signal })

  const container = toRecord(payload)
  if (!container) throw invalidResponse('服务端返回的数据不是对象')

  const entries = container.entries
  if (!Array.isArray(entries)) throw invalidResponse('服务端返回的 entries 不是数组')

  return entries.map(normalizeEntry)
}

/** GET /api/entries/:id */
export async function getEntry(id: string): Promise<Entry> {
  return pickEntry(await apiRequest<unknown>(entryPath(id)))
}

/** POST /api/entries */
export async function createEntry(input: {
  content: string
  mood: MoodId
  tags: string[]
}): Promise<Entry> {
  const payload = await apiRequest<unknown>('/entries', {
    method: 'POST',
    body: { content: input.content, mood: input.mood, tags: input.tags }
  })

  return pickEntry(payload)
}

/** PATCH /api/entries/:id，只发送调用方明确提供的字段 */
export async function updateEntry(
  id: string,
  patch: { content?: string; mood?: MoodId; tags?: string[] }
): Promise<Entry> {
  const body: { content?: string; mood?: MoodId; tags?: string[] } = {}
  if (patch.content !== undefined) body.content = patch.content
  if (patch.mood !== undefined) body.mood = patch.mood
  if (patch.tags !== undefined) body.tags = patch.tags

  const payload = await apiRequest<unknown>(entryPath(id), { method: 'PATCH', body })
  return pickEntry(payload)
}

/** DELETE /api/entries/:id（204 无 body） */
export async function deleteEntry(id: string): Promise<void> {
  await apiRequest<void>(entryPath(id), { method: 'DELETE' })
}

/** PUT /api/entries/:id/like（幂等，likes 的加减由服务端处理） */
export async function setEntryLiked(id: string, liked: boolean): Promise<Entry> {
  const payload = await apiRequest<unknown>(`${entryPath(id)}/like`, {
    method: 'PUT',
    body: { liked }
  })

  return pickEntry(payload)
}
