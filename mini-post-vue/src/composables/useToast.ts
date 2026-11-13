import { ref } from 'vue'

const message = ref('')
const isError = ref(false)
const visible = ref(false)

let timer: number | undefined

/** 全局单例提示条，任何组件都能调用 */
export function useToast() {
  function show(text: string, type: 'info' | 'error' = 'info'): void {
    message.value = text
    isError.value = type === 'error'
    visible.value = true

    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      visible.value = false
    }, 2200)
  }

  function hide(): void {
    visible.value = false
    message.value = ''
    isError.value = false

    if (timer) {
      window.clearTimeout(timer)
      timer = undefined
    }
  }

  return { message, isError, visible, show, hide }
}
