<script setup lang="ts">
import { computed, ref } from 'vue'
import { MAX_TAG_LEN, MAX_TAGS, PRESET_TAGS } from '@/constants/tags'
import { countChars } from '@/utils/text'

const model = defineModel<string[]>({ required: true })
const emit = defineEmits<{ error: [message: string] }>()

const customTags = ref<string[]>([])
const input = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

const allTags = computed(() => [...PRESET_TAGS, ...customTags.value])

function toggle(tag: string): void {
  if (model.value.includes(tag)) {
    model.value = model.value.filter((item) => item !== tag)
    return
  }

  if (model.value.length >= MAX_TAGS) {
    emit('error', `最多选择 ${MAX_TAGS} 个主题`)
    return
  }

  model.value = [...model.value, tag]
}

function addCustom(): void {
  const value = input.value.trim()

  if (!value) {
    inputEl.value?.focus()
    return
  }

  if (countChars(value) > MAX_TAG_LEN) {
    emit('error', `自定义主题最多 ${MAX_TAG_LEN} 个字`)
    return
  }

  if (allTags.value.includes(value)) {
    emit('error', '这个主题已经存在了')
    input.value = ''
    return
  }

  if (model.value.length >= MAX_TAGS) {
    emit('error', `最多选择 ${MAX_TAGS} 个主题`)
    return
  }

  customTags.value = [...customTags.value, value]
  model.value = [...model.value, value]
  input.value = ''
  inputEl.value?.focus()
}

/** 提交成功后由父组件调用，清空自定义主题（对齐原版 state.customTags = []） */
function reset(): void {
  customTags.value = []
  input.value = ''
}

defineExpose({ reset })
</script>

<template>
  <div class="tag-row">
    <span class="tag-label">主题</span>
    <div id="tag-picker" class="tag-picker" role="group" aria-label="选择主题标签">
      <button
        v-for="tag in allTags"
        :key="tag"
        type="button"
        class="tag-chip"
        :aria-pressed="model.includes(tag) ? 'true' : 'false'"
        @click="toggle(tag)"
      >
        #{{ tag }}
      </button>
    </div>
    <div class="tag-custom">
      <label class="sr-only" for="tag-input">自定义主题</label>
      <input
        id="tag-input"
        ref="inputEl"
        v-model="input"
        class="tag-input"
        type="text"
        maxlength="8"
        placeholder="自定义主题"
        autocomplete="off"
        @keydown.enter.prevent="addCustom"
      />
      <button id="tag-add" type="button" class="tag-add" @click="addCustom">添加</button>
    </div>
  </div>
</template>
