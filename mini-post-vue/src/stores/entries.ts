import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { createEntry, listEntries, setEntryLiked } from '@/api/entries'
import { getMood } from '@/constants/moods'
import { MAX_LEN, MAX_TAGS } from '@/constants/tags'
import { computeStats } from '@/utils/stats'
import { countChars } from '@/utils/text'
import type { Entry, EntryStats, MoodId } from '@/types'

/** 首次加载失败时的提示文案（组件层直接展示） */
export const ENTRIES_LOAD_ERROR = '加载记录失败，请稍后重试'

export interface AddEntryInput {
  content: string
  mood: MoodId
  tags: string[]
}

export type AddEntryResult =
  | { ok: true; entry: Entry }
  | { ok: false; reason: 'empty' | 'too-long' | 'network' }

/** 服务端不保证顺序，统一按 createdAt 倒序 */
function sortByCreatedAtDesc(list: Entry[]): Entry[] {
  return [...list].sort((a, b) => b.createdAt - a.createdAt)
}

export const useEntriesStore = defineStore('entries', () => {
  const entries = ref<Entry[]>([])
  const newEntryId = ref<string | null>(null)
  const initialized = ref(false)
  /** 首次加载中 */
  const loading = ref(false)
  /** 首次加载失败的中文文案 */
  const error = ref<string | null>(null)
  /** 用于在跨天时强制重算统计（computeStats 依赖「当前时间」） */
  const statsTick = ref(0)

  /** 首次加载的 in-flight promise：并发调用 init() 只发一次请求 */
  let pendingInit: Promise<void> | null = null

  const stats = computed<EntryStats>(() => {
    void statsTick.value
    return computeStats(entries.value)
  })
  const total = computed(() => entries.value.length)

  function normalizeTags(tags: string[]): string[] {
    const cleaned = tags.map((tag) => tag.trim()).filter((tag) => tag !== '')
    return Array.from(new Set(cleaned)).slice(0, MAX_TAGS)
  }

  /** 真正的加载逻辑：失败不外抛，只写 error 文案 */
  async function load(): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const list = await listEntries()
      entries.value = sortByCreatedAtDesc(list)
      initialized.value = true
    } catch {
      entries.value = []
      error.value = ENTRIES_LOAD_ERROR
    } finally {
      loading.value = false
    }
  }

  function init(): Promise<void> {
    if (initialized.value) return Promise.resolve()
    if (pendingInit) return pendingInit

    const task = load()
    pendingInit = task
    // 无论成功失败都清掉 in-flight，失败后允许再次 init() 重试
    void task
      .finally(() => {
        pendingInit = null
      })
      .catch(() => {})

    return task
  }

  async function addEntry(input: AddEntryInput): Promise<AddEntryResult> {
    const content = input.content.trim()

    // 本地先校验一次，避免无意义的网络往返（服务端同样会校验）
    if (!content) return { ok: false, reason: 'empty' }
    if (countChars(content) > MAX_LEN) return { ok: false, reason: 'too-long' }

    try {
      const entry = await createEntry({
        content,
        mood: getMood(input.mood).id,
        tags: normalizeTags(input.tags)
      })

      entries.value = sortByCreatedAtDesc([entry, ...entries.value])
      newEntryId.value = entry.id

      return { ok: true, entry }
    } catch {
      return { ok: false, reason: 'network' }
    }
  }

  async function toggleLike(id: string): Promise<boolean> {
    const current = entries.value.find((entry) => entry.id === id)
    if (!current) return false

    const original = current
    const nextLiked = !original.liked
    const optimistic: Entry = {
      ...original,
      liked: nextLiked,
      likes: Math.max(0, original.likes + (nextLiked ? 1 : -1))
    }

    // 乐观更新：先翻转本地状态，交互零延迟
    entries.value = entries.value.map((entry) => (entry.id === id ? optimistic : entry))

    try {
      const saved = await setEntryLiked(id, nextLiked)
      // 以服务端返回的条目为准（计数可能被其他人改动）
      entries.value = entries.value.map((entry) => (entry.id === id ? saved : entry))
      return true
    } catch {
      // 失败回滚到请求前的值
      entries.value = entries.value.map((entry) => (entry.id === id ? original : entry))
      return false
    }
  }

  function clearNewEntryId(): void {
    newEntryId.value = null
  }

  /** 跨天后强制重算统计 */
  function refreshStats(): void {
    statsTick.value += 1
  }

  return {
    entries,
    newEntryId,
    initialized,
    loading,
    error,
    stats,
    total,
    init,
    addEntry,
    toggleLike,
    clearNewEntryId,
    refreshStats
  }
})
