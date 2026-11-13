<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import MoodPicker from '@/components/MoodPicker.vue'
import TagPicker from '@/components/TagPicker.vue'
import { getMood } from '@/constants/moods'
import { MAX_LEN } from '@/constants/tags'
import { useToast } from '@/composables/useToast'
import { useEntriesStore } from '@/stores/entries'
import { countChars } from '@/utils/text'
import type { MoodId } from '@/types'

const entries = useEntriesStore()
const toast = useToast()

const content = ref('')
const mood = ref<MoodId>('calm')
const tags = ref<string[]>([])
const shaking = ref(false)
/** 提交进行中：防重复提交，同时禁用按钮 */
const submitting = ref(false)
const inputEl = ref<HTMLTextAreaElement | null>(null)
const tagPickerEl = ref<{ reset: () => void } | null>(null)

let shakeTimer: number | undefined

const remaining = computed(() => MAX_LEN - countChars(content.value))
const counterText = computed(() => {
  if (remaining.value < 0) return `已超出 ${Math.abs(remaining.value)} 字`
  return `还可输入 ${remaining.value} 字`
})
const counterClass = computed(() => ({
  'is-danger': remaining.value < 0,
  'is-warning': remaining.value >= 0 && remaining.value <= 40
}))
const canSubmit = computed(
  () => content.value.trim().length > 0 && remaining.value >= 0 && !submitting.value
)
const moodLabel = computed(() => getMood(mood.value).label)

function autoGrow(): void {
  const el = inputEl.value
  if (!el) return

  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 320)}px`
}

function shake(): void {
  shaking.value = true
  inputEl.value?.focus()

  if (shakeTimer) window.clearTimeout(shakeTimer)
  shakeTimer = window.setTimeout(() => {
    shaking.value = false
  }, 420)
}

async function submit(): Promise<void> {
  if (submitting.value) return

  // 本地先挡掉明显不合法的输入，保持「抖动 / 提示」的即时反馈
  if (!content.value.trim()) {
    shake()
    return
  }

  if (remaining.value < 0) {
    toast.show(`最多只能输入 ${MAX_LEN} 字`, 'error')
    return
  }

  submitting.value = true

  try {
    const result = await entries.addEntry({
      content: content.value,
      mood: mood.value,
      tags: tags.value
    })

    if (result.ok) {
      content.value = ''
      tags.value = []
      tagPickerEl.value?.reset()
      toast.show('已保存到服务器')
      void nextTick(() => inputEl.value?.focus())
      return
    }

    if (result.reason === 'empty') {
      shake()
      return
    }

    if (result.reason === 'too-long') {
      toast.show(`最多只能输入 ${MAX_LEN} 字`, 'error')
      return
    }

    toast.show('保存失败，请检查网络后重试', 'error')
  } finally {
    submitting.value = false
  }
}

function handleSubmit(event?: Event): void {
  event?.preventDefault()
  void submit()
}

function handleKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    void submit()
  }
}

function handleTagError(message: string): void {
  toast.show(message, 'error')
}

watch(content, () => {
  void nextTick(autoGrow)
})

onMounted(autoGrow)
</script>

<template>
  <section id="composer-card" class="card composer" :class="{ 'is-shake': shaking }" aria-label="记录今天的心情">
    <form id="composer" class="composer-form" novalidate @submit="handleSubmit">
      <div class="composer-head">
        <span class="composer-title">今天的心情</span>
        <span id="mood-current" class="mood-current">{{ moodLabel }}</span>
      </div>

      <MoodPicker v-model="mood" />

      <TagPicker ref="tagPickerEl" v-model="tags" @error="handleTagError" />

      <label class="sr-only" for="composer-input">写下此刻的心情</label>
      <textarea
        id="composer-input"
        ref="inputEl"
        v-model="content"
        class="composer-input"
        rows="3"
        placeholder="今天发生了什么？此刻的心情是怎样的？"
        aria-describedby="char-counter"
        @keydown="handleKeydown"
      ></textarea>

      <div class="composer-footer">
        <span class="composer-hint">服务端同步存储 · Ctrl / ⌘ + Enter 记录</span>
        <div class="composer-actions">
          <span id="char-counter" class="counter" :class="counterClass">{{ counterText }}</span>
          <button id="submit-btn" type="submit" class="btn-primary" :disabled="!canSubmit">记录心情</button>
        </div>
      </div>
    </form>
  </section>
</template>
