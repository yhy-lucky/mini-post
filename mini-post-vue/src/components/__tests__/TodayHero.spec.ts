import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TodayHero from '@/components/TodayHero.vue'
import { listEntries } from '@/api/entries'
import { useEntriesStore } from '@/stores/entries'
import { mountWithPinia } from '@/test/utils'
import type { Entry } from '@/types'

vi.mock('@/api/entries', () => ({
  listEntries: vi.fn(),
  getEntry: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  setEntryLiked: vi.fn()
}))

const listMock = vi.mocked(listEntries)

const FIXED = new Date(2026, 10, 13, 9, 30, 0)

function entry(id: string, createdAt: number, mood: Entry['mood']): Entry {
  return { id, content: id, mood, tags: [], likes: 0, liked: false, createdAt }
}

function at(day: number, hour = 12): number {
  return new Date(2026, 10, day, hour).getTime()
}

/** 先让 store 从（模拟的）接口拿到记录，再挂载，避免首屏读到空数据 */
async function mountWithEntries(entries: Entry[]) {
  listMock.mockResolvedValue(entries)

  const pinia = createPinia()
  setActivePinia(pinia)
  await useEntriesStore(pinia).init()

  return mount(TodayHero, { global: { plugins: [pinia] } })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED)
  listMock.mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('TodayHero', () => {
  it('按当前时间展示问候、日期与时钟', () => {
    const wrapper = mountWithPinia(TodayHero)

    expect(wrapper.get('#greeting').text()).toBe('上午好')
    expect(wrapper.get('#hero-day').text()).toBe('13')
    expect(wrapper.get('#hero-month').text()).toBe('2026 年 11 月')
    expect(wrapper.get('#hero-weekday').text()).toBe('星期五')
    expect(wrapper.get('#clock').text()).toBe('09:30:00')
  })

  it('时钟每秒走时', async () => {
    const wrapper = mountWithPinia(TodayHero)

    await vi.advanceTimersByTimeAsync(1000)

    expect(wrapper.get('#clock').text()).toBe('09:30:01')
  })

  it('展示本月记录、连续天数与累计条数', async () => {
    const wrapper = await mountWithEntries([
      entry('a', at(13, 8), 'happy'),
      entry('b', at(12, 20), 'sad'),
      entry('c', at(10, 9), 'calm')
    ])

    expect(wrapper.get('#stat-total').text()).toBe('3')
    expect(wrapper.get('#stat-month').text()).toBe('3')
    expect(wrapper.get('#stat-streak').text()).toBe('2')
  })

  it('本月心情分布按条数分段', async () => {
    const wrapper = await mountWithEntries([
      entry('a', at(13, 8), 'happy'),
      entry('b', at(13, 9), 'happy'),
      entry('c', at(12), 'sad')
    ])

    const segments = wrapper.findAll('.mood-seg')
    expect(segments).toHaveLength(2)
    expect(segments[0]!.attributes('title')).toBe('开心 · 2 条')
    expect(segments[1]!.attributes('title')).toBe('低落 · 1 条')
  })

  it('本月没有记录时展示占位文案', () => {
    const wrapper = mountWithPinia(TodayHero)

    expect(wrapper.get('.mood-dist').text()).toBe('还没有记录')
  })
})
