<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppToast from '@/components/AppToast.vue'
import BackgroundDecor from '@/components/BackgroundDecor.vue'
import CityDialog from '@/components/CityDialog.vue'
import ComposerCard from '@/components/ComposerCard.vue'
import TimelineList from '@/components/TimelineList.vue'
import TodayHero from '@/components/TodayHero.vue'
import { useToast } from '@/composables/useToast'
import { useEntriesStore } from '@/stores/entries'
import { useSettingsStore } from '@/stores/settings'
import { useWeatherStore } from '@/stores/weather'
import type { Location } from '@/types'

const entries = useEntriesStore()
const settings = useSettingsStore()
const weather = useWeatherStore()
const toast = useToast()

const cityOpen = ref(false)
const dayNow = ref(Date.now())

function openCityDialog(): void {
  cityOpen.value = true
}

function closeCityDialog(): void {
  cityOpen.value = false
}

function selectCity(location: Location): void {
  void settings.setLocation(location)
  closeCityDialog()
  void weather.request(location)
}

async function handleToggleLike(id: string): Promise<void> {
  const ok = await entries.toggleLike(id)
  if (!ok) toast.show('点赞失败，请稍后重试', 'error')
}

function handleDayChange(): void {
  dayNow.value = Date.now()
  entries.refreshStats()
}

function focusComposer(): void {
  document.getElementById('composer-input')?.focus()
}
</script>

<template>
  <BackgroundDecor />

  <AppHeader />

  <main class="page">
    <TodayHero @open-city="openCityDialog" @day-change="handleDayChange" />

    <ComposerCard />

    <p v-if="entries.error" class="load-error" role="status">{{ entries.error }}</p>

    <TimelineList
      :entries="entries.entries"
      :now="dayNow"
      :new-entry-id="entries.newEntryId"
      @toggle-like="handleToggleLike"
      @focus-composer="focusComposer"
    />
  </main>

  <footer class="page-footer">
    <p>所有记录都保存在服务器上，本地不再留存副本。</p>
  </footer>

  <CityDialog :open="cityOpen" @close="closeCityDialog" @select="selectCity" />

  <AppToast />
</template>

<style scoped>
.load-error {
  margin: 0 0 14px;
  padding: 10px 14px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-md);
  background: var(--surface);
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--like);
  text-align: center;
}
</style>
