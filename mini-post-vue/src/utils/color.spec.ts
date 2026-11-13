import { describe, expect, it } from 'vitest'
import { hexToRgba } from '@/utils/color'

describe('hexToRgba', () => {
  it('把十六进制转成 rgba 字符串', () => {
    expect(hexToRgba('#F59E0B', 0.14)).toBe('rgba(245, 158, 11, 0.14)')
    expect(hexToRgba('#5B5BF6', 0.3)).toBe('rgba(91, 91, 246, 0.3)')
  })

  it('支持黑色与白色边界', () => {
    expect(hexToRgba('#000000', 1)).toBe('rgba(0, 0, 0, 1)')
    expect(hexToRgba('#FFFFFF', 0)).toBe('rgba(255, 255, 255, 0)')
  })
})
