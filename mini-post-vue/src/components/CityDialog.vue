<script setup lang="ts">
import { ref, watch } from 'vue'
import { getCurrentLocation, isGeolocationSupported } from '@/api/geolocation'
import { searchCities } from '@/api/weather'
import { DEFAULT_TIMEZONE } from '@/constants/weather'
import type { CityResult, Location } from '@/types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; select: [location: Location] }>()

const IDLE_STATUS = '输入城市名搜索，或使用当前位置。'

const dialogEl = ref<HTMLDialogElement | null>(null)
const keyword = ref('')
const status = ref(IDLE_STATUS)
const statusError = ref(false)
const results = ref<CityResult[]>([])

let controller: AbortController | null = null

function setStatus(message: string, isError: boolean): void {
  status.value = message
  statusError.value = isError
}

function reset(): void {
  keyword.value = ''
  results.value = []
  setStatus(IDLE_STATUS, false)
}

watch(
  () => props.open,
  (open) => {
    const el = dialogEl.value
    if (!el) return

    if (open) {
      reset()
      if (typeof el.showModal === 'function' && !el.open) el.showModal()
      else el.setAttribute('open', '')
      return
    }

    if (typeof el.close === 'function' && el.open) el.close()
    else el.removeAttribute('open')
  }
)

function toLocation(city: CityResult): Location {
  return {
    name: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
    timezone: city.timezone || DEFAULT_TIMEZONE
  }
}

async function runSearch(): Promise<void> {
  const value = keyword.value.trim()

  if (!value) {
    setStatus('请先输入城市名称。', true)
    return
  }

  controller?.abort()
  controller = new AbortController()

  setStatus('正在搜索…', false)
  results.value = []

  try {
    const list = await searchCities(value, { signal: controller.signal })
    if (!list.length) {
      setStatus('没有找到这个城市，换个名称试试。', true)
      return
    }

    results.value = list
    setStatus('选择要显示天气的城市：', false)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    setStatus('搜索失败，请检查网络后重试。', true)
  }
}

function selectCity(city: CityResult): void {
  emit('select', toLocation(city))
}

async function locate(): Promise<void> {
  if (!isGeolocationSupported()) {
    setStatus('当前浏览器不支持定位，请直接搜索城市。', true)
    return
  }

  setStatus('正在定位…', false)

  try {
    const coords = await getCurrentLocation()
    emit('select', {
      name: '当前位置',
      latitude: coords.latitude,
      longitude: coords.longitude,
      timezone: DEFAULT_TIMEZONE
    })
  } catch {
    setStatus('定位失败或已拒绝授权，请手动搜索城市。', true)
  }
}
</script>

<template>
  <dialog id="city-dialog" ref="dialogEl" class="city-dialog" aria-labelledby="city-title">
    <div class="dialog-head">
      <h2 id="city-title" class="dialog-title">更换城市</h2>
      <button id="city-close" type="button" class="icon-btn" aria-label="关闭" @click="emit('close')">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>

    <div class="city-search">
      <label class="sr-only" for="city-input">城市名称</label>
      <input
        id="city-input"
        v-model="keyword"
        class="city-input"
        type="text"
        placeholder="输入城市名，例如：杭州"
        autocomplete="off"
        @keydown.enter.prevent="runSearch"
      />
      <button id="city-search-btn" type="button" class="btn-primary btn-sm" @click="runSearch">搜索</button>
    </div>

    <p id="city-status" class="city-status" :class="{ 'is-error': statusError }">{{ status }}</p>

    <ul id="city-results" class="city-results">
      <li v-for="city in results" :key="`${city.name}-${city.latitude}-${city.longitude}`">
        <button type="button" class="city-result" @click="selectCity(city)">
          <strong>{{ city.name }}</strong>
          <span>{{ [city.admin1, city.country].filter(Boolean).join(' · ') }}</span>
        </button>
      </li>
    </ul>

    <button id="city-locate" type="button" class="btn-ghost city-locate" @click="locate">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3.2" />
        <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21" />
      </svg>
      使用我的当前位置
    </button>
  </dialog>
</template>
