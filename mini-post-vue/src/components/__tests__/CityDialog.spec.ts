import { describe, expect, it, vi } from 'vitest'
import CityDialog from '@/components/CityDialog.vue'
import { flushPromises, mountWithPinia } from '@/test/utils'

function okResponse(payload: unknown): Response {
  return { ok: true, status: 200, json: async () => payload } as unknown as Response
}

function stubFetch(payload: unknown): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(payload)))
}

async function search(wrapper: ReturnType<typeof mountWithPinia>, keyword: string) {
  await wrapper.get('#city-input').setValue(keyword)
  await wrapper.get('#city-search-btn').trigger('click')
  await flushPromises()
}

describe('CityDialog', () => {
  it('未输入城市名时提示', async () => {
    const wrapper = mountWithPinia(CityDialog, { props: { open: true } })

    await wrapper.get('#city-search-btn').trigger('click')

    expect(wrapper.get('#city-status').text()).toBe('请先输入城市名称。')
    expect(wrapper.get('#city-status').classes()).toContain('is-error')
  })

  it('搜索成功后展示结果列表', async () => {
    stubFetch({
      results: [
        { name: '杭州', latitude: 30.2741, longitude: 120.1551, admin1: '浙江省', country: '中国' },
        { name: '杭州湾', latitude: 30.5, longitude: 121.1 }
      ]
    })
    const wrapper = mountWithPinia(CityDialog, { props: { open: true } })

    await search(wrapper, '杭州')

    expect(wrapper.get('#city-status').text()).toBe('选择要显示天气的城市：')
    expect(wrapper.findAll('.city-result')).toHaveLength(2)
    expect(wrapper.findAll('.city-result')[0]!.text()).toContain('杭州')
    expect(wrapper.findAll('.city-result')[0]!.text()).toContain('浙江省 · 中国')
  })

  it('点击结果派发 select 事件', async () => {
    stubFetch({ results: [{ name: '杭州', latitude: 30.2741, longitude: 120.1551, timezone: 'Asia/Shanghai' }] })
    const wrapper = mountWithPinia(CityDialog, { props: { open: true } })

    await search(wrapper, '杭州')
    await wrapper.get('.city-result').trigger('click')

    expect(wrapper.emitted('select')?.[0]).toEqual([
      { name: '杭州', latitude: 30.2741, longitude: 120.1551, timezone: 'Asia/Shanghai' }
    ])
  })

  it('没有搜索结果时提示换个名称', async () => {
    stubFetch({ results: [] })
    const wrapper = mountWithPinia(CityDialog, { props: { open: true } })

    await search(wrapper, '不存在的地方')

    expect(wrapper.get('#city-status').text()).toBe('没有找到这个城市，换个名称试试。')
  })

  it('搜索请求失败时提示重试', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const wrapper = mountWithPinia(CityDialog, { props: { open: true } })

    await search(wrapper, '杭州')

    expect(wrapper.get('#city-status').text()).toBe('搜索失败，请检查网络后重试。')
  })

  it('定位失败时提示手动搜索', async () => {
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      writable: true,
      value: {
        getCurrentPosition: (_success: PositionCallback, error: PositionErrorCallback) => {
          error({ code: 1, message: 'denied' } as GeolocationPositionError)
        }
      }
    })
    const wrapper = mountWithPinia(CityDialog, { props: { open: true } })

    await wrapper.get('#city-locate').trigger('click')
    await flushPromises()

    expect(wrapper.get('#city-status').text()).toBe('定位失败或已拒绝授权，请手动搜索城市。')
  })

  it('定位成功时派发 select 事件', async () => {
    Object.defineProperty(window.navigator, 'geolocation', {
      configurable: true,
      writable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => {
          success({ coords: { latitude: 31.23, longitude: 121.47 } } as GeolocationPosition)
        }
      }
    })
    const wrapper = mountWithPinia(CityDialog, { props: { open: true } })

    await wrapper.get('#city-locate').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('select')?.[0]).toEqual([
      { name: '当前位置', latitude: 31.23, longitude: 121.47, timezone: 'Asia/Shanghai' }
    ])
  })

  it('关闭按钮派发 close 事件', async () => {
    const wrapper = mountWithPinia(CityDialog, { props: { open: true } })

    await wrapper.get('#city-close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
