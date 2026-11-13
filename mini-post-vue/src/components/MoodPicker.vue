<script setup lang="ts">
import IconBase from '@/components/icons/IconBase.vue'
import { MOODS } from '@/constants/moods'
import { hexToRgba } from '@/utils/color'
import type { MoodId } from '@/types'

const model = defineModel<MoodId>({ required: true })
</script>

<template>
  <div id="mood-picker" class="mood-picker" role="radiogroup" aria-label="选择心情">
    <button
      v-for="mood in MOODS"
      :key="mood.id"
      type="button"
      class="mood-chip"
      role="radio"
      :aria-checked="mood.id === model ? 'true' : 'false'"
      :aria-label="`心情：${mood.label}`"
      :data-mood="mood.id"
      :style="{
        '--mood-color': mood.color,
        '--mood-tint': hexToRgba(mood.color, 0.14),
        '--mood-ring': hexToRgba(mood.color, 0.3)
      }"
      @click="model = mood.id"
    >
      <IconBase :path="mood.path" />
      <span>{{ mood.label }}</span>
    </button>
  </div>
</template>
