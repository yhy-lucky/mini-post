import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import type { ComponentMountingOptions } from '@vue/test-utils'
import type { Component } from 'vue'

/** 挂载组件并注入一份全新的 Pinia（同时激活，便于直接拿 store 断言） */
export function mountWithPinia<T extends Component>(component: T, options: ComponentMountingOptions<T> = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)

  return mount(component, {
    ...options,
    global: {
      ...options.global,
      plugins: [pinia, ...(options.global?.plugins ?? [])]
    }
  } as ComponentMountingOptions<T>)
}

export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
