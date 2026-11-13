import { describe, expect, it, vi } from 'vitest'
import TimelineList from '@/components/TimelineList.vue'
import { mountWithPinia } from '@/test/utils'
import type { Entry } from '@/types'

const NOW = new Date(2026, 10, 13, 10, 0).getTime()

function entry(id: string, createdAt: number): Entry {
  return { id, content: `内容-${id}`, mood: 'calm', tags: [], likes: 0, liked: false, createdAt }
}

function at(month: number, day: number, hour = 12): number {
  return new Date(2026, month - 1, day, hour).getTime()
}

describe('TimelineList', () => {
  it('没有记录时展示空状态', () => {
    const wrapper = mountWithPinia(TimelineList, { props: { entries: [], now: NOW } })

    expect(wrapper.get('.post-count').text()).toBe('共 0 条')
    expect(wrapper.text()).toContain('还没有写下今天的心情')
    expect(wrapper.find('.timeline').exists()).toBe(false)
  })

  it('有记录时按天分组并显示条数', () => {
    const wrapper = mountWithPinia(TimelineList, {
      props: { entries: [entry('a', at(11, 13, 20)), entry('b', at(11, 12, 9))], now: NOW }
    })

    const groups = wrapper.findAll('.day-group')
    expect(wrapper.get('.post-count').text()).toBe('共 2 条')
    expect(groups).toHaveLength(2)
    expect(groups[0]!.get('.day-label').text()).toBe('今天')
    expect(groups[0]!.get('.day-date').text()).toBe('星期五 · 1 条')
    expect(groups[1]!.get('.day-label').text()).toBe('昨天')
  })

  it('转发点赞事件', async () => {
    const wrapper = mountWithPinia(TimelineList, { props: { entries: [entry('a', at(11, 13))], now: NOW } })

    await wrapper.get('.like-btn').trigger('click')

    expect(wrapper.emitted('toggle-like')?.[0]).toEqual(['a'])
  })

  it('空状态按钮请求聚焦输入框', async () => {
    const onFocus = vi.fn()
    const wrapper = mountWithPinia(TimelineList, {
      props: { entries: [], now: NOW, onFocusComposer: onFocus }
    })

    await wrapper.get('.empty .btn-ghost').trigger('click')

    expect(wrapper.emitted('focus-composer')).toBeTruthy()
  })
})
