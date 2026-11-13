import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ComposerCard from '@/components/ComposerCard.vue'
import { useToast } from '@/composables/useToast'
import { createEntry, deleteEntry, getEntry, listEntries, setEntryLiked, updateEntry } from '@/api/entries'
import { useEntriesStore } from '@/stores/entries'
import { flushPromises, mountWithPinia } from '@/test/utils'
import type { Entry } from '@/types'

vi.mock('@/api/entries', () => ({
  listEntries: vi.fn(),
  getEntry: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  setEntryLiked: vi.fn()
}))

const createMock = vi.mocked(createEntry)

let seq = 0

async function addCustomTag(wrapper: ReturnType<typeof mountWithPinia>, value: string) {
  await wrapper.get('#tag-input').setValue(value)
  await wrapper.get('#tag-add').trigger('click')
  await nextTick()
}

function serverEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: `srv-${++seq}`,
    content: '服务端记录',
    mood: 'calm',
    tags: [],
    likes: 0,
    liked: false,
    createdAt: Date.now(),
    ...overrides
  }
}

beforeEach(() => {
  seq = 0
  useToast().hide()

  vi.mocked(listEntries).mockResolvedValue([])
  vi.mocked(getEntry).mockImplementation(async (id: string) => serverEntry({ id }))
  vi.mocked(updateEntry).mockImplementation(async (id: string) => serverEntry({ id }))
  vi.mocked(deleteEntry).mockResolvedValue(undefined)
  vi.mocked(setEntryLiked).mockImplementation(async (id: string, liked: boolean) =>
    serverEntry({ id, liked, likes: liked ? 1 : 0 })
  )
  createMock.mockImplementation(async (input) =>
    serverEntry({ content: input.content, mood: input.mood, tags: [...input.tags] })
  )
})

describe('ComposerCard', () => {
  it('默认停留在平静心情且不允许提交', () => {
    const wrapper = mountWithPinia(ComposerCard)

    expect(wrapper.get('.mood-current').text()).toBe('平静')
    expect(wrapper.get('#char-counter').text()).toBe('还可输入 280 字')
    expect(wrapper.get('#submit-btn').attributes('disabled')).toBeDefined()
  })

  it('输入后实时更新剩余字数并启用提交', async () => {
    const wrapper = mountWithPinia(ComposerCard)

    await wrapper.get('#composer-input').setValue('今天心情不错')

    expect(wrapper.get('#char-counter').text()).toBe('还可输入 274 字')
    expect(wrapper.get('#submit-btn').attributes('disabled')).toBeUndefined()
  })

  it('剩余 40 字以内进入提醒状态', async () => {
    const wrapper = mountWithPinia(ComposerCard)

    await wrapper.get('#composer-input').setValue('a'.repeat(240))

    expect(wrapper.get('#char-counter').classes()).toContain('is-warning')
    expect(wrapper.get('#char-counter').text()).toBe('还可输入 40 字')
  })

  it('超出上限时显示 danger 并禁用提交', async () => {
    const wrapper = mountWithPinia(ComposerCard)

    await wrapper.get('#composer-input').setValue('a'.repeat(281))

    expect(wrapper.get('#char-counter').text()).toBe('已超出 1 字')
    expect(wrapper.get('#char-counter').classes()).toContain('is-danger')
    expect(wrapper.get('#submit-btn').attributes('disabled')).toBeDefined()
  })

  it('提交后交给服务端、清空输入并提示已保存', async () => {
    const wrapper = mountWithPinia(ComposerCard)
    const entries = useEntriesStore()

    await wrapper.get('#composer-input').setValue(' 今天很安静 ')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(createMock).toHaveBeenCalledWith({ content: '今天很安静', mood: 'calm', tags: [] })
    expect(entries.entries).toHaveLength(1)
    expect(entries.entries[0]!.content).toBe('今天很安静')
    expect((wrapper.get('#composer-input').element as HTMLTextAreaElement).value).toBe('')
    expect(useToast().message.value).toBe('已保存到服务器')
    expect(useToast().isError.value).toBe(false)
  })

  it('提交后清空已选主题', async () => {
    const wrapper = mountWithPinia(ComposerCard)

    await wrapper.findAll('.tag-chip')[0]!.trigger('click')
    await wrapper.get('#composer-input').setValue('带主题的记录')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findAll('.tag-chip')[0]!.attributes('aria-pressed')).toBe('false')
  })

  it('Ctrl + Enter 可直接提交', async () => {
    const wrapper = mountWithPinia(ComposerCard)
    const entries = useEntriesStore()

    await wrapper.get('#composer-input').setValue('快捷键提交')
    await wrapper.get('#composer-input').trigger('keydown', { key: 'Enter', ctrlKey: true })
    await flushPromises()

    expect(entries.entries).toHaveLength(1)
  })

  it('空内容提交时抖动提示且不发请求', async () => {
    const wrapper = mountWithPinia(ComposerCard)

    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('.composer').classes()).toContain('is-shake')
    expect(createMock).not.toHaveBeenCalled()
  })

  it('超过 280 字提交时给出错误提示且不发请求', async () => {
    const wrapper = mountWithPinia(ComposerCard)

    await wrapper.get('#composer-input').setValue('a'.repeat(281))
    await wrapper.get('form').trigger('submit')

    expect(useToast().message.value).toBe('最多只能输入 280 字')
    expect(useToast().isError.value).toBe(true)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('网络失败时提示检查网络并保留输入', async () => {
    const wrapper = mountWithPinia(ComposerCard)
    const entries = useEntriesStore()
    createMock.mockRejectedValueOnce(new Error('offline'))

    await wrapper.get('#composer-input').setValue('写不进去')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(entries.entries).toHaveLength(0)
    expect(useToast().message.value).toBe('保存失败，请检查网络后重试')
    expect(useToast().isError.value).toBe(true)
    expect((wrapper.get('#composer-input').element as HTMLTextAreaElement).value).toBe('写不进去')
  })

  it('切换心情后提交对应心情', async () => {
    const wrapper = mountWithPinia(ComposerCard)
    const entries = useEntriesStore()

    await wrapper.findAll('.mood-chip')[0]!.trigger('click')
    expect(wrapper.get('.mood-current').text()).toBe('开心')

    await wrapper.get('#composer-input').setValue('很开心')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(createMock).toHaveBeenCalledWith({ content: '很开心', mood: 'happy', tags: [] })
    expect(entries.entries[0]!.mood).toBe('happy')
  })

  it('提交成功后清空自定义主题，芯片回到预设 8 个', async () => {
    const wrapper = mountWithPinia(ComposerCard)

    await addCustomTag(wrapper, '咖啡')
    expect(wrapper.findAll('.tag-chip')).toHaveLength(9)
    expect(wrapper.findAll('.tag-chip').map((chip) => chip.text())).toContain('#咖啡')

    await wrapper.get('#composer-input').setValue('喝了一杯手冲')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await nextTick()

    expect(wrapper.findAll('.tag-chip')).toHaveLength(8)
    expect(wrapper.findAll('.tag-chip').map((chip) => chip.text())).not.toContain('#咖啡')
    expect((wrapper.get('#tag-input').element as HTMLInputElement).value).toBe('')
  })

  it('提交成功后输入框重新获得焦点', async () => {
    const wrapper = mountWithPinia(ComposerCard, { attachTo: document.body })

    await wrapper.get('#composer-input').setValue('写点东西')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await nextTick()

    expect(document.activeElement).toBe(wrapper.get('#composer-input').element)
    wrapper.unmount()
  })

  it('保存失败时保留自定义主题且不聚焦输入框', async () => {
    const wrapper = mountWithPinia(ComposerCard, { attachTo: document.body })
    createMock.mockRejectedValueOnce(new Error('offline'))

    await addCustomTag(wrapper, '咖啡')
    await wrapper.get('#composer-input').setValue('写不进去')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    await nextTick()

    expect(wrapper.findAll('.tag-chip')).toHaveLength(9)
    expect((wrapper.get('#composer-input').element as HTMLTextAreaElement).value).toBe('写不进去')
    expect(document.activeElement).not.toBe(wrapper.get('#composer-input').element)
    wrapper.unmount()
  })

  it('提交进行中禁用按钮且不会重复发请求', async () => {
    let release: ((value: Entry) => void) | null = null
    createMock.mockImplementation(
      () =>
        new Promise<Entry>((resolve) => {
          release = resolve
        })
    )

    const wrapper = mountWithPinia(ComposerCard)

    await wrapper.get('#composer-input').setValue('慢慢来')
    await wrapper.get('form').trigger('submit')
    await nextTick()

    expect(wrapper.get('#submit-btn').attributes('disabled')).toBeDefined()

    await wrapper.get('form').trigger('submit')
    await wrapper.get('#composer-input').trigger('keydown', { key: 'Enter', ctrlKey: true })
    expect(createMock).toHaveBeenCalledTimes(1)

    release!(serverEntry({ content: '慢慢来' }))
    await flushPromises()

    expect(wrapper.get('#submit-btn').attributes('disabled')).toBeDefined()
    expect(useToast().message.value).toBe('已保存到服务器')
  })

  it('保留原版 DOM id 契约', () => {
    const wrapper = mountWithPinia(ComposerCard)

    expect(wrapper.get('form').attributes('id')).toBe('composer')
    expect(wrapper.find('#composer-card').exists()).toBe(true)
    expect(wrapper.get('#mood-current').text()).toBe('平静')
    expect(wrapper.find('#composer-input').exists()).toBe(true)
    expect(wrapper.find('#char-counter').exists()).toBe(true)
    expect(wrapper.find('#submit-btn').exists()).toBe(true)
  })
})
