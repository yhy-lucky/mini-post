import { describe, expect, it } from 'vitest'
import AppHeader from '@/components/AppHeader.vue'
import { useSettingsStore } from '@/stores/settings'
import { mountWithPinia } from '@/test/utils'

describe('AppHeader', () => {
  it('渲染品牌信息与云端同步标识', () => {
    const wrapper = mountWithPinia(AppHeader)

    expect(wrapper.get('.brand-name').text()).toBe('心情日记')
    expect(wrapper.get('.brand-sub').text()).toContain('把今天的心情')
    expect(wrapper.get('.local-badge').text()).toContain('云端同步')
  })

  it('为深色状态提供正确的无障碍属性', () => {
    const wrapper = mountWithPinia(AppHeader)
    const button = wrapper.get('#theme-toggle')

    expect(button.attributes('aria-pressed')).toBe('false')
    expect(button.attributes('aria-label')).toBe('切换到深色主题')
  })

  it('点击后切换主题并更新无障碍文案', async () => {
    const wrapper = mountWithPinia(AppHeader)
    const settings = useSettingsStore()

    await wrapper.get('#theme-toggle').trigger('click')

    expect(settings.theme).toBe('dark')
    expect(wrapper.get('#theme-toggle').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('#theme-toggle').attributes('aria-label')).toBe('切换到浅色主题')
  })

  it('再次点击回到浅色', async () => {
    const wrapper = mountWithPinia(AppHeader)
    const settings = useSettingsStore()

    await wrapper.get('#theme-toggle').trigger('click')
    await wrapper.get('#theme-toggle').trigger('click')

    expect(settings.theme).toBe('light')
    expect(settings.effectiveTheme).toBe('light')
  })
})
