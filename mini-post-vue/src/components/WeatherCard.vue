<script setup lang="ts">
import { computed } from 'vue'
import IconBase from '@/components/icons/IconBase.vue'
import { weatherInfo } from '@/api/weather'
import { WEATHER_PATHS, WEATHER_TONES } from '@/constants/weather'
import { useWeatherStore } from '@/stores/weather'

const emit = defineEmits<{ 'open-city': [] }>()

const weather = useWeatherStore()

const info = computed(() => weatherInfo(weather.data?.code ?? 3))
const tone = computed(() => WEATHER_TONES[info.value.key])
const iconPath = computed(() => WEATHER_PATHS[info.value.key])

/** 没有数据也没有错误时保持「加载中」外观（与旧版首屏一致） */
const isLoading = computed(() => !weather.data && !weather.error)

const temperature = computed(() =>
  weather.data ? `${Math.round(weather.data.temperature)}°` : '--°'
)

const desc = computed(() => {
  if (weather.data) return info.value.text
  if (weather.error) return '暂时无法获取'
  return '正在获取天气'
})

const extra = computed(() =>
  weather.data
    ? `体感 ${Math.round(weather.data.apparent)}° · 湿度 ${Math.round(weather.data.humidity)}%`
    : '体感 --° · 湿度 --%'
)

const cityName = computed(() => {
  if (weather.location) return weather.location.name
  return weather.error ? '点击可更换城市' : '定位中…'
})

function handleRetry(): void {
  void weather.retry()
}
</script>

<template>
  <div class="hero-weather">
    <button
      id="weather-card"
      type="button"
      class="weather-card"
      :class="{ 'is-loading': isLoading }"
      :style="{ '--weather-tone': tone }"
      aria-haspopup="dialog"
      aria-label="查看天气或更换城市"
      @click="emit('open-city')"
    >
      <span id="weather-icon" class="weather-glyph" aria-hidden="true">
        <IconBase :path="iconPath" />
      </span>
      <span class="weather-body">
        <span id="weather-temp" class="weather-temp">{{ temperature }}</span>
        <span id="weather-desc" class="weather-desc">{{ desc }}</span>
      </span>
      <span id="weather-extra" class="weather-meta">{{ extra }}</span>
      <span class="weather-city">
        <span id="weather-city-name">{{ cityName }}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </button>

    <p v-if="weather.error" id="weather-hint" class="weather-hint">
      <span id="weather-hint-text">{{ weather.error }}</span>，<button id="weather-retry" type="button" @click="handleRetry">
        重试
      </button>
    </p>
  </div>
</template>
