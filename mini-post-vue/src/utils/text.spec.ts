import { describe, expect, it } from 'vitest'
import { countChars } from '@/utils/text'

describe('countChars', () => {
  it('普通文本按字符数计', () => {
    expect(countChars('')).toBe(0)
    expect(countChars('hello')).toBe(5)
    expect(countChars('今天心情不错')).toBe(6)
  })

  it('emoji 按码点计为 1 个字', () => {
    expect(countChars('😀')).toBe(1)
    expect(countChars('😀a')).toBe(2)
    expect(countChars('开心😀难过')).toBe(5)
  })

  it('组合 emoji 逐码点计数（与旧版 Array.from 语义一致）', () => {
    expect(countChars('👨‍👩‍👧')).toBe(5)
  })

  it('换行与空格计入长度', () => {
    expect(countChars('a\nb c')).toBe(5)
  })
})
