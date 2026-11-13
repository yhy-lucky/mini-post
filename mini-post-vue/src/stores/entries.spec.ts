import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createEntry, listEntries, setEntryLiked } from '@/api/entries'
import { useEntriesStore } from '@/stores/entries'
import { MAX_LEN } from '@/constants/tags'
import type { Entry, MoodId } from '@/types'

vi.mock('@/api/entries', () => ({
  listEntries: vi.fn(),
  getEntry: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  setEntryLiked: vi.fn()
}))

const NOW = new Date(2026, 10, 13, 10, 30).getTime()

const listMock = vi.mocked(listEntries)
const createMock = vi.mocked(createEntry)
const likeMock = vi.mocked(setEntryLiked)

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'seed',
    content: '已存在的记录',
    mood: 'calm',
    tags: [],
    likes: 0,
    liked: false,
    createdAt: NOW - 1000,
    ...overrides
  }
}

/** 模拟服务端把入参落库后返回的条目 */
function serverEntry(
  input: { content: string; mood: MoodId; tags: string[] },
  overrides: Partial<Entry> = {}
): Entry {
  return {
    id: `srv-${input.content}`,
    content: input.content,
    mood: input.mood,
    tags: [...input.tags],
    likes: 0,
    liked: false,
    createdAt: NOW,
    ...overrides
  }
}

/** 模拟 api/client.ts 抛出的 ApiError（这里不依赖真实实现） */
function apiError(): Error {
  return Object.assign(new Error('boom'), { name: 'ApiError', code: 'network', status: 0 })
}

beforeEach(() => {
  setActivePinia(createPinia())
  listMock.mockResolvedValue([])
  createMock.mockImplementation(async (input) => serverEntry(input))
  likeMock.mockImplementation(async (id, liked) => ({
    ...makeEntry({ id, likes: liked ? 1 : 0 }),
    liked
  }))
})

describe('useEntriesStore', () => {
  describe('init', () => {
    it('从接口读取并按时间倒序排列', async () => {
      listMock.mockResolvedValue([
        makeEntry({ id: 'old', createdAt: NOW - 5000 }),
        makeEntry({ id: 'new', createdAt: NOW })
      ])

      const store = useEntriesStore()
      await store.init()

      expect(store.entries.map((entry) => entry.id)).toEqual(['new', 'old'])
      expect(store.initialized).toBe(true)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(listMock).toHaveBeenCalledTimes(1)
    })

    it('加载中 loading 为 true，结束后归零', async () => {
      let release: ((value: Entry[]) => void) | null = null
      listMock.mockImplementation(
        () =>
          new Promise<Entry[]>((resolve) => {
            release = resolve
          })
      )

      const store = useEntriesStore()
      const task = store.init()

      expect(store.loading).toBe(true)

      release!([makeEntry()])
      await task

      expect(store.loading).toBe(false)
      expect(store.entries).toHaveLength(1)
    })

    it('加载失败时保留空列表并给出中文提示，不抛异常', async () => {
      listMock.mockRejectedValue(apiError())

      const store = useEntriesStore()

      await expect(store.init()).resolves.toBeUndefined()

      expect(store.entries).toEqual([])
      expect(store.error).toBe('加载记录失败，请稍后重试')
      expect(store.initialized).toBe(false)
      expect(store.loading).toBe(false)
    })

    it('失败后再次 init 会重新请求', async () => {
      listMock.mockRejectedValueOnce(apiError())

      const store = useEntriesStore()
      await store.init()
      expect(store.error).not.toBeNull()

      listMock.mockResolvedValueOnce([makeEntry({ id: 'again' })])
      await store.init()

      expect(store.entries.map((entry) => entry.id)).toEqual(['again'])
      expect(store.error).toBeNull()
      expect(listMock).toHaveBeenCalledTimes(2)
    })

    it('并发调用只请求一次', async () => {
      listMock.mockResolvedValue([makeEntry()])

      const store = useEntriesStore()
      const a = store.init()
      const b = store.init()
      const c = store.init()

      expect(listMock).toHaveBeenCalledTimes(1)

      await Promise.all([a, b, c])

      expect(listMock).toHaveBeenCalledTimes(1)
      expect(store.entries).toHaveLength(1)
    })

    it('成功后再次调用不会重复请求', async () => {
      listMock.mockResolvedValue([makeEntry()])

      const store = useEntriesStore()
      await store.init()
      await store.init()

      expect(listMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('addEntry', () => {
    it('新增记录置顶、交给服务端并标记为新条目', async () => {
      const created = makeEntry({ id: 'srv-1', content: '新记录', mood: 'happy', tags: ['工作'] })
      createMock.mockResolvedValue(created)

      const store = useEntriesStore()
      await store.init()

      const result = await store.addEntry({ content: '  新记录  ', mood: 'happy', tags: [' 工作 '] })

      expect(result).toEqual({ ok: true, entry: created })
      expect(createMock).toHaveBeenCalledWith({ content: '新记录', mood: 'happy', tags: ['工作'] })
      expect(store.entries).toHaveLength(1)
      expect(store.entries[0]).toEqual(created)
      expect(store.newEntryId).toBe('srv-1')
    })

    it('服务端返回的 createdAt 较旧时仍按倒序插入', async () => {
      listMock.mockResolvedValue([
        makeEntry({ id: 'a', createdAt: NOW }),
        makeEntry({ id: 'b', createdAt: NOW - 5000 })
      ])

      const store = useEntriesStore()
      await store.init()

      createMock.mockResolvedValue(makeEntry({ id: 'c', createdAt: NOW - 2000 }))
      await store.addEntry({ content: '中间的记录', mood: 'calm', tags: [] })

      expect(store.entries.map((entry) => entry.id)).toEqual(['a', 'c', 'b'])
    })

    it('空白内容被拒绝且不发请求', async () => {
      const store = useEntriesStore()
      await store.init()

      await expect(store.addEntry({ content: '   ', mood: 'calm', tags: [] })).resolves.toEqual({
        ok: false,
        reason: 'empty'
      })

      expect(createMock).not.toHaveBeenCalled()
      expect(store.entries).toHaveLength(0)
    })

    it('超出 280 字被拒绝（按码点计）且不发请求', async () => {
      const store = useEntriesStore()
      await store.init()

      await expect(store.addEntry({ content: '😀'.repeat(MAX_LEN + 1), mood: 'calm', tags: [] })).resolves.toEqual({
        ok: false,
        reason: 'too-long'
      })

      expect(createMock).not.toHaveBeenCalled()
      expect(store.entries).toHaveLength(0)
    })

    it('恰好 280 字可以保存', async () => {
      const store = useEntriesStore()
      await store.init()

      const result = await store.addEntry({ content: 'a'.repeat(MAX_LEN), mood: 'calm', tags: [] })

      expect(result.ok).toBe(true)
      expect(createMock).toHaveBeenCalledTimes(1)
    })

    it('网络失败时返回 network 且不改动列表与标记', async () => {
      const store = useEntriesStore()
      await store.init()

      createMock.mockRejectedValue(apiError())

      await expect(store.addEntry({ content: '写不进去', mood: 'calm', tags: [] })).resolves.toEqual({
        ok: false,
        reason: 'network'
      })

      expect(store.entries).toHaveLength(0)
      expect(store.newEntryId).toBeNull()
    })

    it('主题最多保留 3 个并去重', async () => {
      const store = useEntriesStore()
      await store.init()

      await store.addEntry({ content: '带标签', mood: 'sad', tags: ['工作', '工作', '学习', '生活', '运动'] })

      expect(createMock).toHaveBeenCalledWith({
        content: '带标签',
        mood: 'sad',
        tags: ['工作', '学习', '生活']
      })
      expect(store.entries[0]!.tags).toEqual(['工作', '学习', '生活'])
    })

    it('未知心情归一为平静后再提交', async () => {
      const store = useEntriesStore()
      await store.init()

      await store.addEntry({ content: '心情不明', mood: 'unknown' as never, tags: [] })

      expect(createMock).toHaveBeenCalledWith({ content: '心情不明', mood: 'calm', tags: [] })
      expect(store.entries[0]!.mood).toBe('calm')
    })
  })

  describe('toggleLike', () => {
    it('成功后用服务端返回的结果覆盖该条', async () => {
      const original = makeEntry({ id: 'a', likes: 2, liked: false })
      listMock.mockResolvedValue([original])
      likeMock.mockResolvedValue({ ...original, liked: true, likes: 9 })

      const store = useEntriesStore()
      await store.init()

      await expect(store.toggleLike('a')).resolves.toBe(true)

      expect(likeMock).toHaveBeenCalledWith('a', true)
      expect(store.entries[0]).toMatchObject({ liked: true, likes: 9 })
    })

    it('请求未返回前先做乐观更新', async () => {
      const original = makeEntry({ id: 'a', likes: 2, liked: false })
      listMock.mockResolvedValue([original])

      let release: ((value: Entry) => void) | null = null
      likeMock.mockImplementation(
        () =>
          new Promise<Entry>((resolve) => {
            release = resolve
          })
      )

      const store = useEntriesStore()
      await store.init()

      const task = store.toggleLike('a')

      expect(store.entries[0]).toMatchObject({ liked: true, likes: 3 })

      release!({ ...original, liked: true, likes: 3 })
      await task
    })

    it('取消点赞同步计数', async () => {
      const original = makeEntry({ id: 'a', likes: 3, liked: true })
      listMock.mockResolvedValue([original])
      likeMock.mockResolvedValue({ ...original, liked: false, likes: 2 })

      const store = useEntriesStore()
      await store.init()

      await expect(store.toggleLike('a')).resolves.toBe(true)

      expect(likeMock).toHaveBeenCalledWith('a', false)
      expect(store.entries[0]).toMatchObject({ liked: false, likes: 2 })
    })

    it('计数不会变成负数', async () => {
      const original = makeEntry({ id: 'a', likes: 0, liked: true })
      listMock.mockResolvedValue([original])

      const store = useEntriesStore()
      await store.init()

      await store.toggleLike('a')

      expect(store.entries[0]!.likes).toBe(0)
    })

    it('请求失败时回滚点赞状态并返回 false', async () => {
      const original = makeEntry({ id: 'a', likes: 1, liked: false })
      listMock.mockResolvedValue([original])
      likeMock.mockRejectedValue(apiError())

      const store = useEntriesStore()
      await store.init()

      await expect(store.toggleLike('a')).resolves.toBe(false)

      expect(store.entries[0]).toMatchObject({ liked: false, likes: 1 })
    })

    it('未知 id 直接返回 false 且不请求', async () => {
      const store = useEntriesStore()
      await store.init()

      await expect(store.toggleLike('missing')).resolves.toBe(false)

      expect(likeMock).not.toHaveBeenCalled()
    })
  })

  describe('stats / total', () => {
    it('随记录变化重新计算', async () => {
      const store = useEntriesStore()
      await store.init()

      expect(store.stats.total).toBe(0)
      expect(store.total).toBe(0)

      await store.addEntry({ content: '一条', mood: 'happy', tags: [] })

      expect(store.stats.total).toBe(1)
      expect(store.stats.moodCounts.happy).toBe(1)
      expect(store.stats.streak).toBe(1)
      expect(store.total).toBe(1)
    })

    it('refreshStats 可强制重算（跨天）', () => {
      const store = useEntriesStore()

      expect(() => store.refreshStats()).not.toThrow()
    })
  })

  describe('clearNewEntryId', () => {
    it('可清除入场动画标记', async () => {
      const store = useEntriesStore()
      await store.init()
      await store.addEntry({ content: '动画', mood: 'calm', tags: [] })

      store.clearNewEntryId()

      expect(store.newEntryId).toBeNull()
    })
  })
})
