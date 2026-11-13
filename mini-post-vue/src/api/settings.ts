/**
 * 应用设置（主题 + 城市）的 REST 调用。
 * 结构与旧 localStorage 版保持一致：theme 非法回退 'system'，location 非法回退 null。
 */

import { ApiError, apiRequest } from '@/api/client'
import { DEFAULT_TIMEZONE } from '@/constants/weather'
import type { AppSettings, Location, ThemeSetting } from '@/types'

/** 服务端没有记录时的兜底设置（也是首次启动的默认值） */
export const DEFAULT_SETTINGS: AppSettings = { theme: 'system', location: null }

const INVALID_RESPONSE_STATUS = 200

function invalidResponse(message: string): ApiError {
  return new ApiError('INVALID_RESPONSE', message, INVALID_RESPONSE_STATUS)
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function normalizeTheme(value: unknown): ThemeSetting {
  return value === 'light' || value === 'dark' ? value : 'system'
}

function normalizeLocation(value: unknown): Location | null {
  const item = toRecord(value)
  if (!item) return null

  const latitude = typeof item.latitude === 'number' ? item.latitude : Number.NaN
  const longitude = typeof item.longitude === 'number' ? item.longitude : Number.NaN
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  return {
    name: typeof item.name === 'string' && item.name !== '' ? item.name : '当前位置',
    latitude,
    longitude,
    timezone: typeof item.timezone === 'string' && item.timezone !== '' ? item.timezone : DEFAULT_TIMEZONE
  }
}

/** 任意数据 → 合法 AppSettings（缺字段用默认值，不抛错） */
function normalizeSettings(raw: unknown): AppSettings {
  const item = toRecord(raw)
  if (!item) return { ...DEFAULT_SETTINGS }

  return {
    theme: normalizeTheme(item.theme),
    location: normalizeLocation(item.location)
  }
}

/** 取 { settings } 响应体；连 settings 字段都没有说明服务端实现有问题 */
function pickSettings(payload: unknown): AppSettings {
  const container = toRecord(payload)
  if (!container) throw invalidResponse('服务端返回的设置不是对象')
  if (!('settings' in container)) throw invalidResponse('服务端返回的数据缺少 settings 字段')
  if (!toRecord(container.settings)) throw invalidResponse('服务端返回的 settings 不是对象')

  return normalizeSettings(container.settings)
}

/** GET /api/settings */
export async function fetchSettings(options: { signal?: AbortSignal } = {}): Promise<AppSettings> {
  return pickSettings(await apiRequest<unknown>('/settings', { signal: options.signal }))
}

/** PUT /api/settings */
export async function saveSettings(settings: AppSettings): Promise<AppSettings> {
  const payload = await apiRequest<unknown>('/settings', {
    method: 'PUT',
    body: { theme: settings.theme, location: settings.location }
  })

  return pickSettings(payload)
}
