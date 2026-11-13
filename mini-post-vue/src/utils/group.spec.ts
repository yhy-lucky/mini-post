import { describe, expect, it } from 'vitest'
import { groupEntriesByDay } from '@/utils/group'
import type { Entry } from '@/types'

const NOW = new Date(2026, 10, 13, 10, 0).getTime()

function entry(id: string, createdAt: number): Entry {
  return { id, content: id, mood: 'calm', tags: [], likes: 0, liked: false, createdAt }
}

function at(month: number, day: number, hour = 12): number {
  return new Date(2026, month - 1, day, hour).getTime()
}

describe('groupEntriesByDay', () => {
  it('没有记录时返回空数组', () => {
    expect(groupEntriesByDay([], NOW)).toEqual([])
  })

  it('按日期分组合并同一天的多条记录', () => {
    const groups = groupEntriesByDay(
      [entry('a', at(11, 13, 20)), entry('b', at(11, 13, 9)), entry('c', at(11, 12, 8))],
      NOW
    )

    expect(groups).toHaveLength(2)
    expect(groups[0]!.key).toBe('2026-11-13')
    expect(groups[0]!.items.map((item) => item.id)).toEqual(['a', 'b'])
    expect(groups[1]!.items.map((item) => item.id)).toEqual(['c'])
  })

  it('提供今天 / 昨天 与星期文案', () => {
    const groups = groupEntriesByDay([entry('a', at(11, 13)), entry('b', at(11, 12))], NOW)

    expect(groups[0]!.label).toBe('今天')
    expect(groups[0]!.weekday).toBe('星期五')
    expect(groups[1]!.label).toBe('昨天')
    expect(groups[1]!.weekday).toBe('星期四')
  })

  it('同一天出现在不连续位置时仍按出现顺序生成多个分组', () => {
    const groups = groupEntriesByDay(
      [entry('a', at(11, 13)), entry('b', at(11, 11)), entry('c', at(11, 13, 8))],
      NOW
    )

    expect(groups.map((group) => group.key)).toEqual(['2026-11-13', '2026-11-11', '2026-11-13'])
  })
})
