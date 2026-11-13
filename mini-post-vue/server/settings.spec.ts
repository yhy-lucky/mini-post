import { describe, expect, it } from 'vitest'
import { createHarness } from './testing.ts'
import type { AppSettings } from '../src/types/index.ts'

type SettingsBody = { settings: AppSettings }
type ErrorBody = { error: { code: string } }

describe('GET /api/settings', () => {
  it('从未设置过返回默认值', async () => {
    const api = createHarness()
    const res = await api.json<SettingsBody>('/api/settings')
    expect(res.status).toBe(200)
    expect(res.body.settings).toEqual({ theme: 'system', location: null })
  })
})

describe('PUT /api/settings', () => {
  it('整体替换并随后可读回', async () => {
    const api = createHarness()
    const payload: AppSettings = {
      theme: 'dark',
      location: { name: '上海', latitude: 31.23, longitude: 121.47, timezone: 'Asia/Shanghai' }
    }
    const res = await api.send<SettingsBody>('/api/settings', 'PUT', payload)
    expect(res.status).toBe(200)
    expect(res.body.settings).toEqual(payload)

    const after = await api.json<SettingsBody>('/api/settings')
    expect(after.body.settings).toEqual(payload)
  })

  it('非法 theme 回落 system', async () => {
    const api = createHarness()
    const res = await api.send<SettingsBody>('/api/settings', 'PUT', { theme: 'neon', location: null })
    expect(res.body.settings.theme).toBe('system')
  })

  it('location 缺数值经纬度回落 null', async () => {
    const api = createHarness()
    const res = await api.send<SettingsBody>('/api/settings', 'PUT', {
      theme: 'light',
      location: { name: '某地' }
    })
    expect(res.body.settings).toEqual({ theme: 'light', location: null })
  })

  it('name / timezone 缺省补默认值', async () => {
    const api = createHarness()
    const res = await api.send<SettingsBody>('/api/settings', 'PUT', {
      theme: 'dark',
      location: { latitude: 39.9, longitude: 116.4 }
    })
    expect(res.body.settings.location).toEqual({
      name: '当前位置',
      latitude: 39.9,
      longitude: 116.4,
      timezone: 'Asia/Shanghai'
    })
  })

  it('非法 JSON → 400 INVALID_BODY', async () => {
    const api = createHarness()
    const res = await api.json<ErrorBody>('/api/settings', {
      method: 'PUT',
      body: 'oops',
      headers: { 'Content-Type': 'application/json' }
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('INVALID_BODY')
  })
})
