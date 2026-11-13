import { describe, expect, it } from 'vitest'
import MoodPicker from '@/components/MoodPicker.vue'
import { mountWithPinia } from '@/test/utils'

describe('MoodPicker', () => {
  it('渲染 6 种心情且只有当前心情被选中', () => {
    const wrapper = mountWithPinia(MoodPicker, { props: { modelValue: 'calm' } })
    const chips = wrapper.findAll('.mood-chip')

    expect(chips).toHaveLength(6)
    expect(chips.map((chip) => chip.attributes('aria-label'))).toEqual([
      '心情：开心',
      '心情：平静',
      '心情：兴奋',
      '心情：疲惫',
      '心情：低落',
      '心情：焦虑'
    ])
    expect(chips.map((chip) => chip.attributes('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
      'false',
      'false',
      'false'
    ])
  })

  it('点击未选中的心情会派发新值', async () => {
    const wrapper = mountWithPinia(MoodPicker, { props: { modelValue: 'calm' } })

    await wrapper.findAll('.mood-chip')[0]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['happy'])
  })

  it('心情 chip 使用角色 radio 并携带配色变量', () => {
    const wrapper = mountWithPinia(MoodPicker, { props: { modelValue: 'calm' } })
    const chip = wrapper.findAll('.mood-chip')[0]!

    expect(chip.attributes('role')).toBe('radio')
    expect(chip.attributes('style')).toContain('--mood-color: #F59E0B')
  })
})
