import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import TagPicker from '@/components/TagPicker.vue'
import { mountWithPinia } from '@/test/utils'

type TagPickerExposed = { reset: () => void }

async function addCustomTag(wrapper: ReturnType<typeof mountWithPinia>, value: string) {
  await wrapper.get('#tag-input').setValue(value)
  await wrapper.get('#tag-add').trigger('click')
}

describe('TagPicker', () => {
  it('渲染 8 个预设主题', () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: [] } })
    const chips = wrapper.findAll('.tag-chip')

    expect(chips).toHaveLength(8)
    expect(chips[0]!.text()).toBe('#工作')
    expect(chips[0]!.attributes('aria-pressed')).toBe('false')
  })

  it('已选中的主题带 aria-pressed', () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: ['工作'] } })

    expect(wrapper.findAll('.tag-chip')[0]!.attributes('aria-pressed')).toBe('true')
  })

  it('点击可添加主题', async () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: [] } })

    await wrapper.findAll('.tag-chip')[2]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['生活']])
  })

  it('点击已选主题会取消选择', async () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: ['工作', '学习'] } })

    await wrapper.findAll('.tag-chip')[0]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['学习']])
  })

  it('超过 3 个主题时给出错误提示', async () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: ['工作', '学习', '生活'] } })

    await wrapper.findAll('.tag-chip')[3]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('error')?.[0]).toEqual(['最多选择 3 个主题'])
  })

  it('可添加自定义主题并自动选中', async () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: [] } })

    await addCustomTag(wrapper, ' 咖啡 ')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['咖啡']])
    expect(wrapper.findAll('.tag-chip').map((chip) => chip.text())).toContain('#咖啡')
  })

  it('空的自定义主题不会触发变更', async () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: [] } })

    await addCustomTag(wrapper, '   ')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('error')).toBeUndefined()
  })

  it('自定义主题超过 8 个字时提示', async () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: [] } })

    await addCustomTag(wrapper, '一二三四五六七八九')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('error')?.[0]).toEqual(['自定义主题最多 8 个字'])
  })

  it('重复的自定义主题被拒绝', async () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: ['工作'] } })

    await addCustomTag(wrapper, '工作')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('error')?.[0]).toEqual(['这个主题已经存在了'])
  })

  it('已选满 3 个时不允许添加自定义主题', async () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: ['工作', '学习', '生活'] } })

    await addCustomTag(wrapper, '咖啡')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('error')?.[0]).toEqual(['最多选择 3 个主题'])
  })

  it('reset 清空自定义主题与输入框，且不额外改写已选主题', async () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: [] } })

    await addCustomTag(wrapper, '咖啡')
    await wrapper.get('#tag-input').setValue('半截输入')
    await nextTick()

    ;(wrapper.vm as unknown as TagPickerExposed).reset()
    await nextTick()

    expect(wrapper.findAll('.tag-chip')).toHaveLength(8)
    expect(wrapper.findAll('.tag-chip').map((chip) => chip.text())).not.toContain('#咖啡')
    expect((wrapper.get('#tag-input').element as HTMLInputElement).value).toBe('')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  })

  it('reset 后可以重新添加同名自定义主题', async () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: ['咖啡'] } })

    ;(wrapper.vm as unknown as TagPickerExposed).reset()
    await nextTick()
    await addCustomTag(wrapper, '咖啡')

    expect(wrapper.findAll('.tag-chip').map((chip) => chip.text())).toContain('#咖啡')
    expect(wrapper.emitted('error')).toBeUndefined()
  })

  it('空输入点击添加时把焦点放回输入框', async () => {
    const wrapper = mountWithPinia(TagPicker, { props: { modelValue: [] }, attachTo: document.body })

    await wrapper.get('#tag-add').trigger('click')

    expect(document.activeElement).toBe(wrapper.get('#tag-input').element)
    wrapper.unmount()
  })
})
