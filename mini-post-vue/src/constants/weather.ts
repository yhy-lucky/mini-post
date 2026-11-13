import type { Location, WeatherKind } from '@/types'

export const WEATHER_TTL = 30 * 60 * 1000

export const WEATHER_FETCH_TIMEOUT = 7000

export const DEFAULT_LOCATION: Location = {
  name: '北京',
  latitude: 39.9042,
  longitude: 116.4074,
  timezone: 'Asia/Shanghai'
}

export const DEFAULT_TIMEZONE = 'Asia/Shanghai'

export const WEATHER_TONES: Record<WeatherKind, string> = {
  sun: '#F59E0B',
  partly: '#F59E0B',
  cloud: '#8B90A6',
  fog: '#7F8799',
  drizzle: '#3B82F6',
  rain: '#3B82F6',
  snow: '#60A5FA',
  thunder: '#8B5CF6'
}

export const WEATHER_PATHS: Record<WeatherKind, string> = {
  sun: 'M12 4.4a7.6 7.6 0 1 0 0 15.2 7.6 7.6 0 0 0 0-15.2zM12 1.6v1.4M12 21v1.4M4.2 4.2l1 1M18.8 18.8l1 1M1.6 12H3M21 12h1.4M4.2 19.8l1-1M18.8 5.2l1-1',
  partly:
    'M8.2 8.6a3.9 3.9 0 1 1 4.4 4.2M6.8 18.4h9.6a3.1 3.1 0 0 0 .2-6.2 4.8 4.8 0 0 0-9.2-1.1 3.7 3.7 0 0 0-.6 7.3z',
  cloud: 'M6.8 18.4h9.6a3.1 3.1 0 0 0 .2-6.2 4.8 4.8 0 0 0-9.2-1.1 3.7 3.7 0 0 0-.6 7.3z',
  fog: 'M5.5 9h10M8 13h10.5M4 17h12.5',
  drizzle:
    'M6.8 16.4h9.6a3.1 3.1 0 0 0 .2-6.2 4.8 4.8 0 0 0-9.2-1.1 3.7 3.7 0 0 0-.6 7.3M9 19.2l-.6 1.8M12.6 19.2l-.6 1.8M16.2 19.2l-.6 1.8',
  rain: 'M6.8 16.4h9.6a3.1 3.1 0 0 0 .2-6.2 4.8 4.8 0 0 0-9.2-1.1 3.7 3.7 0 0 0-.6 7.3M8.6 19.2l-.8 2.4M12 19.2l-.8 2.4M15.4 19.2l-.8 2.4',
  snow: 'M6.8 16.4h9.6a3.1 3.1 0 0 0 .2-6.2 4.8 4.8 0 0 0-9.2-1.1 3.7 3.7 0 0 0-.6 7.3M8.8 19.8h.01M12 21h.01M15.2 19.8h.01',
  thunder:
    'M6.8 16.4h9.6a3.1 3.1 0 0 0 .2-6.2 4.8 4.8 0 0 0-9.2-1.1 3.7 3.7 0 0 0-.6 7.3M12.6 18.8l-2 2.8h2.4l-1 2.2'
}

export const HEART_PATH =
  'M12 20.2s-7.2-4.4-7.2-9.4a4.2 4.2 0 0 1 7.2-2.9 4.2 4.2 0 0 1 7.2 2.9c0 5-7.2 9.4-7.2 9.4z'
