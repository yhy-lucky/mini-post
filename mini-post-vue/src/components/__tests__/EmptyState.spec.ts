import { describe, expect, it } from 'vitest'
import EmptyState from '@/components/EmptyState.vue'
import { mountWithPinia } from '@/test/utils'

describe('EmptyState', () => {
  it('保留原版 id 与文案', () => {
    const wrapper = mountWithPinia(EmptyState)

    expect(wrapper.find('#empty-state').exists()).toBe(true)
    expect(wrapper.get('.empty-title').text()).toBe('还没有写下今天的心情')
    expect(wrapper.get('#empty-action').text()).toBe('写下第一条')
  })

  it('点击「写下第一条」派发 focus-composer', async () => {
    const wrapper = mountWithPinia(EmptyState)

    await wrapper.get('#empty-action').trigger('click')

    expect(wrapper.emitted('focus-composer')).toHaveLength(1)
  })
})
