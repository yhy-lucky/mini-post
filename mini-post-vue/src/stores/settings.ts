import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { DEFAULT_SETTINGS, fetchSettings, saveSettings } from '@/api/settings'
import type { EffectiveTheme, Location, ThemeSetting } from '@/types'

export const THEME_COLORS: Record<EffectiveTheme, string> = {
  light: '#F5F6FB',
  dark: '#0F1117'
}

/** 写入服务端失败时的提示文案（只记录，不阻塞主题切换） */
export const SETTINGS_SAVE_ERROR = '设置同步失败，稍后会再次尝试'

function prefersDark(): boolean {
  try {
    return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  } catch {
    return false
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref<ThemeSetting>(DEFAULT_SETTINGS.theme)
  const location = ref<Location | null>(DEFAULT_SETTINGS.location)
  const systemPrefersDark = ref(prefersDark())
  const initialized = ref(false)
  const saveError = ref<string | null>(null)

  /** 首次读取的 in-flight promise：并发调用 init() 只发一次请求 */
  let pendingInit: Promise<void> | null = null

  const effectiveTheme = computed<EffectiveTheme>(() => {
    if (theme.value === 'dark' || theme.value === 'light') return theme.value
    return systemPrefersDark.value ? 'dark' : 'light'
  })

  /** 把当前设置写回服务端；失败只记录，不抛 */
  async function persist(): Promise<void> {
    try {
      await saveSettings({ theme: theme.value, location: location.value })
      saveError.value = null
    } catch {
      saveError.value = SETTINGS_SAVE_ERROR
    }
  }

  /** 写入 html[data-theme] 与地址栏主题色 */
  function applyTheme(): void {
    if (typeof document === 'undefined') return

    const effective = effectiveTheme.value
    document.documentElement.setAttribute('data-theme', effective)

    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', THEME_COLORS[effective])
  }

  function refreshSystemTheme(): void {
    systemPrefersDark.value = prefersDark()
    if (theme.value === 'system') applyTheme()
  }

  function watchSystemTheme(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => refreshSystemTheme()

    if (typeof query.addEventListener === 'function') query.addEventListener('change', handler)
    else if (typeof query.addListener === 'function') query.addListener(handler)
  }

  function setTheme(next: ThemeSetting): void {
    theme.value = next
    applyTheme()
    // 后台持久化，不 await：主题切换必须立刻可见
    void persist()
  }

  function toggleTheme(): void {
    setTheme(effectiveTheme.value === 'dark' ? 'light' : 'dark')
  }

  async function setLocation(next: Location): Promise<void> {
    location.value = next
    await persist()
  }

  async function load(): Promise<void> {
    try {
      const saved = await fetchSettings()
      theme.value = saved?.theme ?? DEFAULT_SETTINGS.theme
      location.value = saved?.location ?? DEFAULT_SETTINGS.location
    } catch {
      // 服务端不可用时兜底默认设置，避免白屏
      theme.value = DEFAULT_SETTINGS.theme
      location.value = DEFAULT_SETTINGS.location
    } finally {
      systemPrefersDark.value = prefersDark()
      watchSystemTheme()
      applyTheme()
      initialized.value = true
    }
  }

  function init(): Promise<void> {
    if (initialized.value) return Promise.resolve()
    if (pendingInit) return pendingInit

    const task = load()
    pendingInit = task
    void task
      .finally(() => {
        pendingInit = null
      })
      .catch(() => {})

    return task
  }

  return {
    theme,
    location,
    systemPrefersDark,
    initialized,
    saveError,
    effectiveTheme,
    init,
    applyTheme,
    setTheme,
    toggleTheme,
    setLocation,
    persist,
    refreshSystemTheme
  }
})
