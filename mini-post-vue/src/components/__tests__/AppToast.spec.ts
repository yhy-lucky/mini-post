import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import AppToast from '@/components/AppToast.vue'
import { useToast } from '@/composables/useToast'
import { mountWithPinia } from '@/test/utils'

beforeEach(() => {
  useToast().hide()
})

describe('AppToast', () => {
  it('保留原版 id 与无障碍属性', () => {
    const wrapper = mountWithPinia(AppToast)
    const toast = wrapper.get('#toast')

    expect(toast.attributes('role')).toBe('status')
    expect(toast.attributes('aria-live')).toBe('polite')
  })

  it('默认不可见，调用 show 后显示文案', async () => {
    const wrapper = mountWithPinia(AppToast)

    expect(wrapper.get('#toast').classes()).not.toContain('is-visible')

    useToast().show('已记录，仅保存在本机')
    await nextTick()

    expect(wrapper.get('#toast').classes()).toContain('is-visible')
    expect(wrapper.get('#toast').text()).toBe('已记录，仅保存在本机')
  })

  it('错误提示带 is-error 类名', async () => {
    const wrapper = mountWithPinia(AppToast)

    useToast().show('本地存储不可用，内容尚未保存', 'error')
    await nextTick()

    expect(wrapper.get('#toast').classes()).toContain('is-error')
  })
})
