import { afterEach, beforeEach, vi } from 'vitest'

/**
 * jsdom 未实现 matchMedia（旧版主题「跟随系统」依赖它），
 * 统一在这里补一个可控的桩，单个用例可传入 matches 覆盖。
 */
export function stubMatchMedia(matches = false): void {
  const impl = vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))

  vi.stubGlobal('matchMedia', impl)

  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: impl
    })
  }
}

beforeEach(() => {
  // 数据已改由 Hono API 保管，这里不再清理 localStorage
  stubMatchMedia(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
