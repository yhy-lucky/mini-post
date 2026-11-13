<script setup lang="ts">
import { computed, watch } from 'vue'
import MoodDistribution from '@/components/MoodDistribution.vue'
import WeatherCard from '@/components/WeatherCard.vue'
import { useClock } from '@/composables/useClock'
import { WEEKDAYS } from '@/constants/date'
import { useEntriesStore } from '@/stores/entries'
import { dateKey, greetingFor, pad } from '@/utils/date'

const emit = defineEmits<{ 'open-city': []; 'day-change': [] }>()

const entries = useEntriesStore()
const { now } = useClock()

const today = computed(() => new Date(now.value))
const greeting = computed(() => greetingFor(today.value.getHours()))
const day = computed(() => String(today.value.getDate()))
const month = computed(() => `${today.value.getFullYear()} 年 ${today.value.getMonth() + 1} 月`)
const weekday = computed(() => WEEKDAYS[today.value.getDay()] ?? '')
const clock = computed(
  () => `${pad(today.value.getHours())}:${pad(today.value.getMinutes())}:${pad(today.value.getSeconds())}`
)

watch(
  () => dateKey(now.value),
  () => emit('day-change')
)
</script>

<template>
  <section class="hero card" aria-label="今日概览">
    <div class="hero-main">
      <p id="greeting" class="hero-greeting">{{ greeting }}</p>
      <div class="hero-date-row">
        <span id="hero-day" class="hero-day">{{ day }}</span>
        <div class="hero-date-meta">
          <span id="hero-month" class="hero-month">{{ month }}</span>
          <span id="hero-weekday" class="hero-weekday">{{ weekday }}</span>
        </div>
      </div>
      <p class="hero-clock">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7.5V12l3 1.8" />
        </svg>
        <span id="clock">{{ clock }}</span>
      </p>
    </div>

    <WeatherCard @open-city="emit('open-city')" />

    <div class="hero-stats">
      <div class="stats">
        <div class="stat">
          <span id="stat-month" class="stat-value">{{ entries.stats.monthDays }}</span>
          <span class="stat-label">本月记录</span>
        </div>
        <span class="stat-divider" aria-hidden="true"></span>
        <div class="stat">
          <span id="stat-streak" class="stat-value">{{ entries.stats.streak }}</span>
          <span class="stat-label">连续天数</span>
        </div>
        <span class="stat-divider" aria-hidden="true"></span>
        <div class="stat">
          <span id="stat-total" class="stat-value">{{ entries.stats.total }}</span>
          <span class="stat-label">累计记录</span>
        </div>
      </div>
      <MoodDistribution :mood-counts="entries.stats.moodCounts" :month-entries="entries.stats.monthEntries" />
    </div>
  </section>
</template>
