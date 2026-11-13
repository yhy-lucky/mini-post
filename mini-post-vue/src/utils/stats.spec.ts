import { describe, expect, it } from 'vitest'
import { MOODS } from '@/constants/moods'
import { computeStats } from '@/utils/stats'
import type { Entry, MoodId } from '@/types'

/** 2026-11-13（星期五）10:30 */
const NOW = new Date(2026, 10, 13, 10, 30).getTime()

function at(month: number, day: number, hour = 12, year = 2026): number {
  return new Date(year, month - 1, day, hour).getTime()
}

function entry(createdAt: number, mood: MoodId = 'calm'): Entry {
  return {
    id: `id-${createdAt}-${mood}`,
    content: '内容',
    mood,
    tags: [],
    likes: 0,
    liked: false,
    createdAt
  }
}

function emptyMoodCounts() {
  return Object.fromEntries(MOODS.map((mood) => [mood.id, 0]))
}

describe('computeStats', () => {
  it('没有记录时全部为 0，且心情分布键齐全', () => {
    const stats = computeStats([], NOW)

    expect(stats).toEqual({
      monthDays: 0,
      monthEntries: 0,
      total: 0,
      streak: 0,
      moodCounts: emptyMoodCounts()
    })
  })

  it('同一天多条记录只算一次「本月记录天数」', () => {
    const entries = [entry(at(11, 13, 9)), entry(at(11, 13, 20)), entry(at(11, 12, 8))]

    const stats = computeStats(entries, NOW)

    expect(stats.monthDays).toBe(2)
    expect(stats.monthEntries).toBe(3)
    expect(stats.total).toBe(3)
  })

  it('连续天数从今天向前累计', () => {
    const entries = [entry(at(11, 13)), entry(at(11, 12)), entry(at(11, 11)), entry(at(11, 9))]

    expect(computeStats(entries, NOW).streak).toBe(3)
  })

  it('今天还没记录时从昨天起算连续天数', () => {
    const entries = [entry(at(11, 12)), entry(at(11, 11))]

    expect(computeStats(entries, NOW).streak).toBe(2)
  })

  it('今天与昨天都没有记录时连续天数为 0', () => {
    const entries = [entry(at(11, 11)), entry(at(11, 10))]

    expect(computeStats(entries, NOW).streak).toBe(0)
  })

  it('中间断档时只统计不间断的一段', () => {
    const entries = [entry(at(11, 13)), entry(at(11, 11)), entry(at(11, 10))]

    expect(computeStats(entries, NOW).streak).toBe(1)
  })

  it('未来时间戳的记录不会延长连续天数', () => {
    const entries = [entry(at(11, 14)), entry(at(11, 12))]

    expect(computeStats(entries, NOW).streak).toBe(1)
  })

  it('跨月连续记录也能连上', () => {
    const firstOfMonth = new Date(2026, 10, 1, 10).getTime()
    const entries = [entry(at(11, 1, 9)), entry(at(10, 31, 21))]

    const stats = computeStats(entries, firstOfMonth)

    expect(stats.streak).toBe(2)
    expect(stats.monthDays).toBe(1)
    expect(stats.monthEntries).toBe(1)
    expect(stats.total).toBe(2)
  })

  it('上月记录计入总数但不计入本月指标', () => {
    const entries = [entry(at(10, 31)), entry(at(10, 30)), entry(at(11, 13))]

    const stats = computeStats(entries, NOW)

    expect(stats.total).toBe(3)
    expect(stats.monthDays).toBe(1)
    expect(stats.monthEntries).toBe(1)
  })

  it('心情分布只统计本月并按心情累加', () => {
    const entries = [
      entry(at(11, 13), 'happy'),
      entry(at(11, 13), 'happy'),
      entry(at(11, 12), 'sad'),
      entry(at(11, 11), 'anxious')
    ]

    const stats = computeStats(entries, NOW)

    expect(stats.moodCounts.happy).toBe(2)
    expect(stats.moodCounts.sad).toBe(1)
    expect(stats.moodCounts.anxious).toBe(1)
    expect(stats.moodCounts.calm).toBe(0)
  })

  it('未知心情不计入分布，但仍计入条数', () => {
    const dirty = entry(at(11, 13))
    dirty.mood = 'unknown' as MoodId

    const stats = computeStats([dirty], NOW)

    expect(stats.monthEntries).toBe(1)
    expect(Object.keys(stats.moodCounts)).toEqual(MOODS.map((mood) => mood.id))
    expect(stats.moodCounts.calm).toBe(0)
  })

  it('默认以当前时间为准', () => {
    const entries = [entry(Date.now())]

    expect(computeStats(entries).streak).toBe(1)
  })
})
