import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_SETTINGS, fetchSettings, saveSettings } from '@/api/settings'
import { SETTINGS_SAVE_ERROR, THEME_COLORS, useSettingsStore } from '@/stores/settings'
import { flushPromises } from '@/test/utils'
import type { AppSettings, Location } from '@/types'

vi.mock('@/api/settings', () => ({
  DEFAULT_SETTINGS: { theme: 'system', location: null },
  fetchSettings: vi.fn(),
  saveSettings: vi.fn()
}))

const HANGZHOU: Location = { name: '杭州', latitude: 30.2741, longitude: 120.1551, timezone: 'Asia/Shanghai' }

const fetchMock = vi.mocked(fetchSettings)
const saveMock = vi.mocked(saveSettings)

function metaContent(): string | null | undefined {
  return document.querySelector('meta[name="theme-color"]')?.getAttribute('content')
}

beforeEach(() => {
  setActivePinia(createPinia())
  document.head.innerHTML = '<meta name="theme-color" content="#F5F6FB">'
  document.documentElement.removeAttribute('data-theme')

  fetchMock.mockResolvedValue({ theme: 'system', location: null })
  saveMock.mockImplementation(async (settings: AppSettings) => settings)
})

describe('useSettingsStore', () => {
  describe('init', () => {
    it('默认跟随系统且没有地点', async () => {
      const store = useSettingsStore()
      await store.init()

      expect(store.theme).toBe('system')
      expect(store.location).toBeNull()
      expect(store.effectiveTheme).toBe('light')
      expect(store.initialized).toBe(true)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('读取服务端已保存的主题与地点', async () => {
      fetchMock.mockResolvedValue({ theme: 'dark', location: HANGZHOU })

      const store = useSettingsStore()
      await store.init()

      expect(store.theme).toBe('dark')
      expect(store.location).toEqual(HANGZHOU)
      expect(store.effectiveTheme).toBe('dark')
    })

    it('读取失败时兜底默认设置且不抛异常', async () => {
      fetchMock.mockRejectedValue(new Error('offline'))

      const store = useSettingsStore()

      await expect(store.init()).resolves.toBeUndefined()

      expect(store.theme).toBe(DEFAULT_SETTINGS.theme)
      expect(store.location).toBe(DEFAULT_SETTINGS.location)
      expect(store.effectiveTheme).toBe('light')
      expect(store.initialized).toBe(true)
    })

    it('并发调用只请求一次', async () => {
      const store = useSettingsStore()
      const a = store.init()
      const b = store.init()
      const c = store.init()

      expect(fetchMock).toHaveBeenCalledTimes(1)

      await Promise.all([a, b, c])

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(store.initialized).toBe(true)
    })

    it('成功后再次调用不会重复请求', async () => {
      const store = useSettingsStore()
      await store.init()
      await store.init()

      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('applyTheme', () => {
    it('同步 html 属性与主题色', async () => {
      fetchMock.mockResolvedValue({ theme: 'dark', location: null })

      const store = useSettingsStore()
      await store.init()

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      expect(metaContent()).toBe('#0F1117')
    })

    it('浅色主题使用浅色地址栏', async () => {
      fetchMock.mockResolvedValue({ theme: 'light', location: null })

      const store = useSettingsStore()
      await store.init()

      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
      expect(metaContent()).toBe('#F5F6FB')
    })

    it('挂载前可以先手动上色（main.ts 用法）', () => {
      const store = useSettingsStore()

      store.applyTheme()

      expect(document.documentElement.getAttribute('data-theme')).toBe('light')
      expect(THEME_COLORS.light).toBe('#F5F6FB')
    })
  })

  describe('setTheme / toggleTheme', () => {
    it('设置主题会立即生效并后台同步', async () => {
      const store = useSettingsStore()
      await store.init()

      store.setTheme('dark')

      expect(store.theme).toBe('dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
      expect(saveMock).toHaveBeenCalledWith({ theme: 'dark', location: null })

      await flushPromises()
      expect(store.saveError).toBeNull()
    })

    it('在深色基础上切换会得到浅色', async () => {
      fetchMock.mockResolvedValue({ theme: 'dark', location: null })

      const store = useSettingsStore()
      await store.init()

      store.toggleTheme()

      expect(store.theme).toBe('light')
      expect(saveMock).toHaveBeenCalledWith({ theme: 'light', location: null })
    })

    it('同步失败时内存态仍然更新并记录 saveError', async () => {
      const store = useSettingsStore()
      await store.init()

      saveMock.mockRejectedValue(new Error('offline'))

      expect(() => store.setTheme('dark')).not.toThrow()
      expect(store.theme).toBe('dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

      await flushPromises()

      expect(store.saveError).toBe(SETTINGS_SAVE_ERROR)
    })
  })

  describe('setLocation', () => {
    it('保存地点并等待同步完成', async () => {
      const store = useSettingsStore()
      await store.init()

      await store.setLocation(HANGZHOU)

      expect(store.location).toEqual(HANGZHOU)
      expect(saveMock).toHaveBeenCalledWith({ theme: 'system', location: HANGZHOU })
    })
  })

  describe('系统主题监听', () => {
    it('跟随系统时受系统偏好影响', async () => {
      const store = useSettingsStore()
      await store.init()

      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: vi.fn((query: string) => ({
          matches: true,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn()
        }))
      })

      store.refreshSystemTheme()

      expect(store.theme).toBe('system')
      expect(store.effectiveTheme).toBe('dark')
    })

    it('系统偏好变化时自动应用（theme 为 system）', async () => {
      const captured: { handler: (() => void) | null } = { handler: null }
      let matches = false

      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: vi.fn((query: string) => ({
          get matches() {
            return matches
          },
          media: query,
          addEventListener: (_event: string, callback: () => void) => {
            captured.handler = callback
          },
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn()
        }))
      })

      const store = useSettingsStore()
      await store.init()

      expect(store.effectiveTheme).toBe('light')

      matches = true
      captured.handler?.()

      expect(store.effectiveTheme).toBe('dark')
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    })
  })
})
