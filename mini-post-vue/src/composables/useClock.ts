import { onUnmounted, ref } from 'vue'

/** 秒级时钟；组件卸载时自动清理 */
export function useClock(interval = 1000) {
  const now = ref(Date.now())
  let timer: number | undefined

  function tick(): void {
    now.value = Date.now()
  }

  function stop(): void {
    if (timer) window.clearInterval(timer)
    timer = undefined
  }

  function start(): void {
    stop()
    timer = window.setInterval(tick, interval)
  }

  start()
  onUnmounted(stop)

  return { now, start, stop }
}
