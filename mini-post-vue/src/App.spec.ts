import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, defineStore } from 'pinia'
import { ref } from 'vue'
import App from './App.vue'

describe('测试脚手架自检', () => {
  it('jsdom 环境与 matchMedia 桩可用', () => {
    expect(typeof window.matchMedia).toBe('function')
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(false)
  })

  it('Pinia 可在测试中被激活并驱动响应式状态', () => {
    const pinia = createPinia()
    const useProbeStore = defineStore('probe', () => {
      const count = ref(0)
      const double = () => count.value * 2
      return { count, double }
    })

    const store = useProbeStore(pinia)
    store.count += 1

    expect(store.count).toBe(1)
    expect(store.double()).toBe(2)
  })

  it('App 能挂载并渲染品牌标题', () => {
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })

    expect(wrapper.text()).toContain('心情日记')
    expect(wrapper.html()).not.toBe('')
  })
})
