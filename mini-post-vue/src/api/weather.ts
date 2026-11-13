import { DEFAULT_TIMEZONE } from '@/constants/weather'
import { expandCityKeywords, mergeCityResults } from '@/utils/citySearch'
import type { RawCityResult } from '@/utils/citySearch'
import type { CityResult, Location, WeatherData, WeatherInfo } from '@/types'

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

const CURRENT_FIELDS = 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code'

interface ForecastPayload {
  current?: {
    temperature_2m?: unknown
    apparent_temperature?: unknown
    relative_humidity_2m?: unknown
    weather_code?: unknown
  }
}

interface GeocodingPayload {
  results?: RawCityResult[]
}

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
}

export interface RequestOptions {
  signal?: AbortSignal
}

/** Open-Meteo weather_code → 展示文案与图标类别 */
export function weatherInfo(code: number): WeatherInfo {
  if (code === 0) return { key: 'sun', text: '晴' }
  if (code === 1) return { key: 'partly', text: '晴间多云' }
  if (code === 2) return { key: 'partly', text: '多云' }
  if (code === 3) return { key: 'cloud', text: '阴' }
  if (code === 45 || code === 48) return { key: 'fog', text: '有雾' }
  if (code >= 51 && code <= 57) return { key: 'drizzle', text: '毛毛雨' }
  if (code >= 61 && code <= 67) return { key: 'rain', text: '下雨' }
  if (code >= 71 && code <= 77) return { key: 'snow', text: '下雪' }
  if (code >= 80 && code <= 82) return { key: 'rain', text: '阵雨' }
  if (code >= 85 && code <= 86) return { key: 'snow', text: '阵雪' }
  if (code >= 95) return { key: 'thunder', text: '雷雨' }
  return { key: 'cloud', text: '多云' }
}

export async function fetchCurrentWeather(
  location: Pick<Location, 'latitude' | 'longitude' | 'timezone'>,
  options: RequestOptions = {}
): Promise<WeatherData> {
  const url =
    `${FORECAST_URL}?latitude=${Number(location.latitude).toFixed(4)}` +
    `&longitude=${Number(location.longitude).toFixed(4)}` +
    `&current=${CURRENT_FIELDS}` +
    `&timezone=${encodeURIComponent(location.timezone || DEFAULT_TIMEZONE)}`

  const response = await fetch(url, { signal: options.signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const payload = (await response.json()) as ForecastPayload | null
  const current = payload?.current
  if (!current || typeof current.temperature_2m !== 'number') {
    throw new Error('天气数据格式异常')
  }

  const temperature = current.temperature_2m

  return {
    temperature,
    apparent: typeof current.apparent_temperature === 'number' ? current.apparent_temperature : temperature,
    humidity: typeof current.relative_humidity_2m === 'number' ? current.relative_humidity_2m : 0,
    code: typeof current.weather_code === 'number' ? current.weather_code : 3
  }
}

/** 单路地理编码查询，保留接口原始字段供排序使用 */
async function requestCities(keyword: string, options: RequestOptions): Promise<RawCityResult[]> {
  const url =
    `${GEOCODING_URL}?name=${encodeURIComponent(keyword)}` + '&count=5&language=zh&format=json'

  const response = await fetch(url, { signal: options.signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const payload = (await response.json()) as GeocodingPayload | null
  return payload?.results ?? []
}

/**
 * 城市搜索。地名库把部分地级市只存成带「市」的全名（长沙 → 长沙市），
 * 且同名小村庄的召回远好于真正的城市，因此这里对候选词并发查询后合并排序。
 */
export async function searchCities(keyword: string, options: RequestOptions = {}): Promise<CityResult[]> {
  const keywords = expandCityKeywords(keyword)
  if (!keywords.length) return []

  const settled = await Promise.allSettled(keywords.map((name) => requestCities(name, options)))

  const aborted = settled.find((item) => item.status === 'rejected' && isAbortError(item.reason))
  if (aborted && aborted.status === 'rejected') throw aborted.reason

  const fulfilled = settled.filter(
    (item): item is PromiseFulfilledResult<RawCityResult[]> => item.status === 'fulfilled'
  )

  if (!fulfilled.length) {
    const failed = settled.find((item) => item.status === 'rejected')
    throw failed && failed.status === 'rejected' ? failed.reason : new Error('城市搜索失败')
  }

  return mergeCityResults(fulfilled.map((item) => item.value))
}
