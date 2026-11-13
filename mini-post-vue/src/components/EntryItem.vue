<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import IconBase from '@/components/icons/IconBase.vue'
import { getMood } from '@/constants/moods'
import { HEART_PATH } from '@/constants/weather'
import { hexToRgba } from '@/utils/color'
import { pad } from '@/utils/date'
import type { Entry } from '@/types'

const props = defineProps<{ entry: Entry; isNew?: boolean }>()
const emit = defineEmits<{ 'toggle-like': [id: string] }>()

const mood = computed(() => getMood(props.entry.mood))
const created = computed(() => new Date(props.entry.createdAt))
const timeText = computed(() => `${pad(created.value.getHours())}:${pad(created.value.getMinutes())}`)
const fullTime = computed(
  () =>
    `${created.value.getFullYear()}-${pad(created.value.getMonth() + 1)}-${pad(created.value.getDate())} ${timeText.value}`
)
const likeLabel = computed(
  () => `${props.entry.liked ? '取消点赞' : '点赞'}，当前 ${props.entry.likes} 个赞`
)

/** 点赞动效只在「保存成功、likes 真的变化」后播放，与原版一致 */
const bumping = ref(false)
let bumpTimer: number | undefined

watch(
  () => props.entry.likes,
  () => {
    bumping.value = true

    if (bumpTimer) window.clearTimeout(bumpTimer)
    bumpTimer = window.setTimeout(() => {
      bumping.value = false
      bumpTimer = undefined
    }, 400)
  }
)

onUnmounted(() => {
  if (bumpTimer) window.clearTimeout(bumpTimer)
})
</script>

<template>
  <article
    class="entry"
    :class="{ 'entry--new': isNew }"
    :data-id="entry.id"
    :style="{
      '--mood-color': mood.color,
      '--mood-tint': hexToRgba(mood.color, 0.14),
      '--mood-ring': hexToRgba(mood.color, 0.28)
    }"
  >
    <span class="entry-mood" aria-hidden="true">
      <IconBase :path="mood.path" />
    </span>

    <div class="entry-body">
      <div class="entry-meta">
        <span class="entry-mood-name">{{ mood.label }}</span>
        <time class="entry-time" :datetime="created.toISOString()" :title="fullTime">{{ timeText }}</time>
      </div>

      <p class="entry-content">{{ entry.content }}</p>

      <div class="entry-foot">
        <div class="entry-tags">
          <span v-for="tag in entry.tags" :key="tag" class="entry-tag">#{{ tag }}</span>
        </div>
        <button
          type="button"
          class="like-btn"
          :class="{ 'is-bumping': bumping }"
          data-action="like"
          :aria-pressed="entry.liked ? 'true' : 'false'"
          :aria-label="likeLabel"
          @click="emit('toggle-like', entry.id)"
        >
          <IconBase :path="HEART_PATH" />
          <span>{{ entry.likes }}</span>
        </button>
      </div>
    </div>
  </article>
</template>
