<script setup lang="ts">
import { computed } from 'vue'
import { MOODS } from '@/constants/moods'
import type { MoodId } from '@/types'

const props = defineProps<{ moodCounts: Record<MoodId, number>; monthEntries: number }>()

const segments = computed(() =>
  MOODS.map((mood) => ({ ...mood, count: props.moodCounts[mood.id] ?? 0 })).filter((mood) => mood.count > 0)
)
</script>

<template>
  <div class="mood-dist-wrap">
    <span class="mood-dist-label">本月心情</span>
    <div id="mood-dist" class="mood-dist" :class="{ 'is-empty': !monthEntries }">
      <template v-if="monthEntries">
        <span
          v-for="segment in segments"
          :key="segment.id"
          class="mood-seg"
          :style="{ '--mood-color': segment.color, flexGrow: segment.count }"
          :title="`${segment.label} · ${segment.count} 条`"
        ></span>
      </template>
      <template v-else>还没有记录</template>
    </div>
  </div>
</template>
