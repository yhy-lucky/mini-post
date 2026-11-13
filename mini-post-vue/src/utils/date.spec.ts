import { afterEach, describe, expect, it, vi } from 'vitest'
import { WEEKDAYS } from '@/constants/date'
import { dateKey, dayLabel, greetingFor, pad, shiftDay } from '@/utils/date'

afterEach(() => {
  vi.useRealTimers()
})

describe('pad', () => {
  it('个位数补零，两位数原样返回', () => {
    expect(pad(0)).toBe('00')
    expect(pad(9)).toBe('09')
    expect(pad(12)).toBe('12')
  })
})

describe('dateKey', () => {
  it('按本地时区生成 YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 0, 5, 23, 59, 59).getTime())).toBe('2026-01-05')
    expect(dateKey(new Date(2026, 10, 13, 0, 0, 0).getTime())).toBe('2026-11-13')
  })

  it('同一天不同时刻得到相同键', () => {
    expect(dateKey(new Date(2026, 10, 13, 0, 1).getTime())).toBe(dateKey(new Date(2026, 10, 13, 23, 59).getTime()))
  })
})

describe('shiftDay', () => {
  it('固定到正午，避免夏令时与边界抖动', () => {
    const shifted = shiftDay(new Date(2026, 10, 13, 3, 7, 9), 0)
    expect(shifted.getHours()).toBe(12)
    expect(shifted.getMinutes()).toBe(0)
    expect(shifted.getSeconds()).toBe(0)
    expect(dateKey(shifted.getTime())).toBe('2026-11-13')
  })

  it('跨月与跨年正确', () => {
    expect(dateKey(shiftDay(new Date(2026, 0, 31, 8), 1).getTime())).toBe('2026-02-01')
    expect(dateKey(shiftDay(new Date(2026, 2, 1, 0, 5), -1).getTime())).toBe('2026-02-28')
    expect(dateKey(shiftDay(new Date(2026, 11, 31, 22), 1).getTime())).toBe('2027-01-01')
  })

  it('不修改入参', () => {
    const source = new Date(2026, 10, 13, 6)
    shiftDay(source, 3)
    expect(source.getDate()).toBe(13)
    expect(source.getHours()).toBe(6)
  })
})

describe('dayLabel', () => {
  const now = new Date(2026, 10, 13, 9, 30).getTime()

  it('今天与昨天使用相对文案', () => {
    expect(dayLabel('2026-11-13', now)).toBe('今天')
    expect(dayLabel('2026-11-12', now)).toBe('昨天')
  })

  it('更早的日期显示 M 月 D 日（不补零）', () => {
    expect(dayLabel('2026-01-05', now)).toBe('1 月 5 日')
    expect(dayLabel('2025-12-31', now)).toBe('12 月 31 日')
  })

  it('默认取当前时间判断今天', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 13, 9, 30))
    expect(dayLabel('2026-11-13')).toBe('今天')
  })
})

describe('greetingFor', () => {
  it.each([
    [0, '夜深了，早点休息'],
    [4, '夜深了，早点休息'],
    [5, '早上好'],
    [8, '早上好'],
    [9, '上午好'],
    [11, '上午好'],
    [12, '中午好'],
    [13, '中午好'],
    [14, '下午好'],
    [17, '下午好'],
    [18, '晚上好'],
    [22, '晚上好'],
    [23, '夜深了，早点休息']
  ])('%i 点 → %s', (hour, expected) => {
    expect(greetingFor(hour)).toBe(expected)
  })
})

describe('WEEKDAYS', () => {
  it('索引与 Date.getDay() 对齐', () => {
    expect(WEEKDAYS[new Date(2026, 10, 13).getDay()]).toBe('星期五')
    expect(WEEKDAYS[new Date(2026, 10, 15).getDay()]).toBe('星期日')
  })
})
