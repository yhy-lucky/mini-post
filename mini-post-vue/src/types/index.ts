export type MoodId = 'happy' | 'calm' | 'excited' | 'tired' | 'sad' | 'anxious'

export type ThemeSetting = 'light' | 'dark' | 'system'

export type EffectiveTheme = 'light' | 'dark'

export type WeatherKind = 'sun' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder'

export interface Mood {
  id: MoodId
  label: string
  color: string
  /** 24x24 描边图标路径 */
  path: string
}

export interface Entry {
  id: string
  content: string
  mood: MoodId
  /** 最多 3 个 */
  tags: string[]
  /** 非负整数 */
  likes: number
  liked: boolean
  /** 毫秒时间戳 */
  createdAt: number
}

export interface Location {
  name: string
  latitude: number
  longitude: number
  timezone: string
}

export interface AppSettings {
  theme: ThemeSetting
  location: Location | null
}

export interface WeatherData {
  temperature: number
  apparent: number
  humidity: number
  /** Open-Meteo weather_code */
  code: number
}

export interface WeatherCache {
  locationKey: string
  location: Pick<Location, 'name' | 'latitude' | 'longitude'>
  fetchedAt: number
  data: WeatherData
}

export interface CityResult {
  name: string
  latitude: number
  longitude: number
  timezone?: string
  admin1?: string
  country?: string
}

export interface WeatherInfo {
  key: WeatherKind
  text: string
}

export interface EntryStats {
  /** 本月有记录的不同日期数 */
  monthDays: number
  /** 本月记录条数 */
  monthEntries: number
  /** 全部记录条数 */
  total: number
  /** 连续记录天数 */
  streak: number
  /** 本月各心情条数 */
  moodCounts: Record<MoodId, number>
}
