import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getCurrentLocation, isGeolocationSupported } from '@/api/geolocation'
import { fetchCurrentWeather } from '@/api/weather'
import { fetchWeatherCache, saveWeatherCache } from '@/api/weatherCache'
import { DEFAULT_LOCATION, DEFAULT_TIMEZONE, WEATHER_FETCH_TIMEOUT } from '@/constants/weather'
import { useSettingsStore } from '@/stores/settings'
import type { Location, WeatherData } from '@/types'

export const WEATHER_ERROR_TEXT = '天气暂不可用'

export const useWeatherStore = defineStore('weather', () => {
  const settings = useSettingsStore()

  const data = ref<WeatherData | null>(null)
  const location = ref<Location | null>(null)
  const loading = ref(false)
  const pendingLocation = ref<Location | null>(null)
  const error = ref<string | null>(null)

  const hasData = computed(() => data.value !== null)

  /**
   * 请求天气；请求进行中再次调用会排队，等当前请求结束后自动执行。
   * 已有数据时静默失败（保留旧数据），无数据时写入错误文案。
   */
  async function request(target: Location): Promise<void> {
    if (loading.value) {
      pendingLocation.value = target
      return
    }

    loading.value = true
    error.value = null

    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), WEATHER_FETCH_TIMEOUT)

    try {
      const result = await fetchCurrentWeather(target, { signal: controller.signal })
      data.value = result
      location.value = target
      // 缓存写入是纯副作用：fire-and-forget，失败绝不能影响已渲染的数据
      void saveWeatherCache(target, result).catch(() => {})
    } catch {
      if (!data.value) error.value = WEATHER_ERROR_TEXT
    } finally {
      window.clearTimeout(timer)
      loading.value = false

      const next = pendingLocation.value
      pendingLocation.value = null
      if (next) void request(next)
    }
  }

  async function init(): Promise<void> {
    // 设置还没就绪时先等它（并发安全，内部复用同一个 promise）
    await settings.init()

    const saved = settings.location

    if (saved) {
      try {
        const cached = await fetchWeatherCache(saved)
        if (cached) {
          // 先用缓存绘一屏，再请求最新数据
          data.value = cached.data
          location.value = { ...cached.location, timezone: saved.timezone }
        }
      } catch {
        // 缓存不可用时静默忽略，直接请求最新天气
      }

      await request(saved)
      return
    }

    if (!isGeolocationSupported()) {
      await request(DEFAULT_LOCATION)
      return
    }

    try {
      const coords = await getCurrentLocation()
      await request({
        name: '当前位置',
        latitude: coords.latitude,
        longitude: coords.longitude,
        timezone: DEFAULT_TIMEZONE
      })
    } catch {
      await request(DEFAULT_LOCATION)
    }
  }

  async function retry(): Promise<void> {
    await request(location.value ?? settings.location ?? DEFAULT_LOCATION)
  }

  return {
    data,
    location,
    loading,
    pendingLocation,
    error,
    hasData,
    init,
    request,
    retry
  }
})
