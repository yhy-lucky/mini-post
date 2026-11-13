import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import EntryItem from '@/components/EntryItem.vue'
import type { Entry } from '@/types'

afterEach(() => {
  vi.useRealTimers()
})

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'entry-1',
    content: '今天很好',
    mood: 'calm',
    tags: ['工作', '生活'],
    likes: 2,
    liked: false,
    createdAt: new Date(2026, 10, 13, 9, 5).getTime(),
    ...overrides
  }
}

describe('EntryItem', () => {
  it('渲染心情、时间、正文与主题', () => {
    const wrapper = mount(EntryItem, { props: { entry: makeEntry() } })

    expect(wrapper.get('.entry-mood-name').text()).toBe('平静')
    expect(wrapper.get('.entry-time').text()).toBe('09:05')
    expect(wrapper.get('.entry-content').text()).toBe('今天很好')
    expect(wrapper.findAll('.entry-tag').map((tag) => tag.text())).toEqual(['#工作', '#生活'])
  })

  it('时间元素带完整 datetime', () => {
    const wrapper = mount(EntryItem, { props: { entry: makeEntry() } })
    const time = wrapper.get('.entry-time')

    expect(time.attributes('datetime')).toContain('2026-11-13')
    expect(time.attributes('title')).toBe('2026-11-13 09:05')
  })

  it('未点赞时按钮状态正确', () => {
    const wrapper = mount(EntryItem, { props: { entry: makeEntry() } })
    const button = wrapper.get('.like-btn')

    expect(button.attributes('aria-pressed')).toBe('false')
    expect(button.attributes('aria-label')).toBe('点赞，当前 2 个赞')
    expect(button.text()).toBe('2')
  })

  it('已点赞时按钮文案反转', () => {
    const wrapper = mount(EntryItem, { props: { entry: makeEntry({ liked: true, likes: 3 }) } })
    const button = wrapper.get('.like-btn')

    expect(button.attributes('aria-pressed')).toBe('true')
    expect(button.attributes('aria-label')).toBe('取消点赞，当前 3 个赞')
  })

  it('点击点赞按钮派发 toggle-like 事件', async () => {
    const wrapper = mount(EntryItem, { props: { entry: makeEntry() } })

    await wrapper.get('.like-btn').trigger('click')

    expect(wrapper.emitted('toggle-like')?.[0]).toEqual(['entry-1'])
  })

  it('新条目带入场动画类名', () => {
    const wrapper = mount(EntryItem, { props: { entry: makeEntry(), isNew: true } })

    expect(wrapper.get('.entry').classes()).toContain('entry--new')
  })

  it('按心情着色', () => {
    const wrapper = mount(EntryItem, { props: { entry: makeEntry({ mood: 'happy' }) } })

    expect(wrapper.get('.entry').attributes('style')).toContain('--mood-color: #F59E0B')
    expect(wrapper.get('.entry-mood-name').text()).toBe('开心')
  })

  it('首次渲染不播放点赞动效', () => {
    const wrapper = mount(EntryItem, { props: { entry: makeEntry() } })

    expect(wrapper.get('.like-btn').classes()).not.toContain('is-bumping')
  })

  it('点赞数增加时添加 is-bumping，动画结束后移除', async () => {
    vi.useFakeTimers()
    const wrapper = mount(EntryItem, { props: { entry: makeEntry({ liked: false, likes: 2 }) } })

    await wrapper.setProps({ entry: makeEntry({ liked: true, likes: 3 }) })
    await nextTick()

    expect(wrapper.get('.like-btn').classes()).toContain('is-bumping')

    vi.advanceTimersByTime(400)
    await nextTick()

    expect(wrapper.get('.like-btn').classes()).not.toContain('is-bumping')
  })

  it('取消点赞同样播放动效', async () => {
    vi.useFakeTimers()
    const wrapper = mount(EntryItem, { props: { entry: makeEntry({ liked: true, likes: 3 }) } })

    await wrapper.setProps({ entry: makeEntry({ liked: false, likes: 2 }) })
    await nextTick()

    expect(wrapper.get('.like-btn').classes()).toContain('is-bumping')
  })

  it('点赞数未变化时不播放动效', async () => {
    vi.useFakeTimers()
    const wrapper = mount(EntryItem, { props: { entry: makeEntry({ liked: false, likes: 2 }) } })

    await wrapper.setProps({ entry: makeEntry({ liked: false, likes: 2, content: '改过的正文' }) })
    await nextTick()

    expect(wrapper.get('.like-btn').classes()).not.toContain('is-bumping')
  })

  it('组件卸载后清理动效定时器', async () => {
    vi.useFakeTimers()
    const wrapper = mount(EntryItem, { props: { entry: makeEntry() } })

    await wrapper.setProps({ entry: makeEntry({ likes: 3 }) })
    wrapper.unmount()

    expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
  })
})
