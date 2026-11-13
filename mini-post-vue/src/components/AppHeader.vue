<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

const isDark = computed(() => settings.effectiveTheme === 'dark')
const toggleLabel = computed(() => (isDark.value ? '切换到浅色主题' : '切换到深色主题'))
</script>

<template>
  <header class="topbar">
    <div class="topbar-inner">
      <div class="brand">
        <span class="brand-logo" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M6 4h9.5A2.5 2.5 0 0 1 18 6.5V20l-3-1.6L12 20l-3-1.6L6 20V4z" />
            <path
              d="M9.2 11.2c.8-1.1 2.4-1.1 2.8.2.4-1.3 2-1.3 2.8-.2.7 1-.3 2.3-2.8 3.6-2.5-1.3-3.5-2.6-2.8-3.6z"
            />
          </svg>
        </span>
        <div class="brand-text">
          <h1 class="brand-name">心情日记</h1>
          <p class="brand-sub">把今天的心情，安静地留在这里</p>
        </div>
      </div>

      <div class="topbar-actions">
        <button
          id="theme-toggle"
          type="button"
          class="icon-btn"
          :aria-label="toggleLabel"
          :aria-pressed="isDark ? 'true' : 'false'"
          @click="settings.toggleTheme()"
        >
          <svg
            class="icon-sun"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="4" />
            <path
              d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            />
          </svg>
          <svg
            class="icon-moon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
          </svg>
        </button>
        <span class="local-badge">
          <span class="local-dot" aria-hidden="true"></span>
          云端同步
        </span>
      </div>
    </div>
  </header>
</template>
