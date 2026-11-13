import { describe, expect, it } from 'vitest'
import { createStore } from './store.ts'
import { createHarness } from './testing.ts'
import type { Entry } from '../src/types/index.ts'

function makeEntry(id: string, createdAt: number): Entry {
  return { id, content: `内容-${id}`, mood: 'calm', tags: [], likes: 0, liked: false, createdAt }
}

describe('createStore', () => {
  it('实例之间互不影响', () => {
    const a = createStore()
    const b = createStore()
    a.insertEntry(makeEntry('a1', 1_700_000_000_000))
    a.writeSettings({ theme: 'dark', location: null })

    expect(a.listEntries()).toHaveLength(1)
    expect(b.listEntries()).toHaveLength(0)
    expect(b.readSettings()).toEqual({ theme: 'system', location: null })
    expect(b.readWeatherCache()).toBeNull()
  })

  it('reset 清空全部状态', () => {
    const store = createStore()
    store.insertEntry(makeEntry('a1', 1_700_000_000_000))
    store.writeSettings({ theme: 'dark', location: null })
    store.reset()

    expect(store.listEntries()).toEqual([])
    expect(store.getEntry('a1')).toBeUndefined()
    expect(store.readSettings()).toEqual({ theme: 'system', location: null })
  })

  it('两个 app 实例的存储互相隔离', async () => {
    const one = createHarness({ now: () => 1_700_000_000_000 })
    const two = createHarness({ now: () => 1_700_000_000_000 })

    await one.send('/api/entries', 'POST', { content: '只属于 one', mood: 'happy' })

    const listTwo = await two.json<{ entries: Entry[] }>('/api/entries')
    expect(listTwo.body.entries).toEqual([])
  })
})
