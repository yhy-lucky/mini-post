import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import WeatherCard from '@/components/WeatherCard.vue'
import { saveWeatherCache } from '@/api/weatherCache'
import { useWeatherStore } from '@/stores/weather'
import { flushPromises, mountWithPinia } from '@/test/utils'
import type { Location, WeatherData } from '@/types'

// 天气 store 现在会把结果回写缓存（内部走 api/client 的 fetch），
// 不 mock 掉就会和本地 stubGlobal 的 fetch 抢调用计数。
vi.mock('@/api/weatherCache', () => ({
  locationKey: vi.fn(() => '0.00,0.00'),
  fetchWeatherCache: vi.fn(async () => null),
  saveWeatherCache: vi.fn()
}))

const HANGZHOU: Location = { name: '杭州', latitude: 30.2741, longitude: 120.1551, timezone: 'Asia/Shanghai' }
const DATA: WeatherData = { temperature: 12.4, apparent: 10.8, humidity: 63, code: 3 }

beforeEach(() => {
  vi.mocked(saveWeatherCache).mockResolvedValue({
    locationKey: '30.27,120.16',
    location: { name: HANGZHOU.name, latitude: HANGZHOU.latitude, longitude: HANGZHOU.longitude },
    fetchedAt: Date.now(),
    data: DATA
  })
})

describe('WeatherCard', () => {
  it('无数据时展示加载态', () => {
    const wrapper = mountWithPinia(WeatherCard)

    expect(wrapper.get('.weather-card').classes()).toContain('is-loading')
    expect(wrapper.get('#weather-desc').text()).toBe('正在获取天气')
    expect(wrapper.get('#weather-temp').text()).toBe('--°')
  })

  it('有数据时展示温度、天气现象、体感、湿度与城市', async () => {
    const wrapper = mountWithPinia(WeatherCard)
    const weather = useWeatherStore()

    weather.data = DATA
    weather.location = HANGZHOU
    weather.loading = false
    await nextTick()

    expect(wrapper.get('#weather-temp').text()).toBe('12°')
    expect(wrapper.get('#weather-desc').text()).toBe('阴')
    expect(wrapper.get('#weather-extra').text()).toBe('体感 11° · 湿度 63%')
    expect(wrapper.get('#weather-city-name').text()).toBe('杭州')
    expect(wrapper.get('.weather-card').classes()).not.toContain('is-loading')
  })

  it('请求失败时展示提示条并可重试', async () => {
    const wrapper = mountWithPinia(WeatherCard)
    const weather = useWeatherStore()

    weather.error = '天气暂不可用'
    weather.location = HANGZHOU
    await nextTick()

    expect(wrapper.get('#weather-hint')).toBeTruthy()
    expect(wrapper.get('#weather-hint-text').text()).toBe('天气暂不可用')

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ current: { temperature_2m: 12 } })
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    await wrapper.get('#weather-retry').trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(weather.error).toBeNull()
  })

  it('点击天气卡请求打开城市弹层', async () => {
    const wrapper = mountWithPinia(WeatherCard)

    await wrapper.get('.weather-card').trigger('click')

    expect(wrapper.emitted('open-city')).toHaveLength(1)
  })
})
