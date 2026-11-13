import { CITY_SUFFIX, PROVINCE_NAMES } from '@/constants/regions'
import type { CityResult } from '@/types'

/** 地理编码接口的原始返回，比渲染所需的 CityResult 多几个排序用字段 */
export interface RawCityResult extends CityResult {
  id?: number
  population?: number
  feature_code?: string
}

const MAX_RESULTS = 8
const CJK_ONLY = /^[\u3400-\u9fff]+$/
const PROVINCES_BY_LENGTH = [...PROVINCE_NAMES].sort((a, b) => b.length - a.length)
const ADMIN_TAIL_AFTER_PROVINCE = /^(省|市|特别行政区|自治区)/

function isProvince(value: string): boolean {
  return PROVINCE_NAMES.includes(value)
}

/** 「湖南省长沙市」→「长沙市」，「湖南长沙」→「长沙」；剥不出有效城市名时返回空串 */
function stripProvincePrefix(value: string): string {
  for (const province of PROVINCES_BY_LENGTH) {
    if (!value.startsWith(province)) continue

    const rest = value.slice(province.length).replace(ADMIN_TAIL_AFTER_PROVINCE, '')
    if (rest.length >= 2) return rest
  }

  return ''
}

/**
 * 把一个关键词扩展成地理编码接口应该查询的一组候选词。
 *
 * - 「长沙」→ `长沙` + `长沙市`（地名库里部分地级市只存了带「市」的全名）
 * - 「湖南长沙」→ `长沙` + `长沙市`
 * - 「湖南 长沙」→ 同上
 * - 「长沙市」/「长沙县」/「Changsha」→ 只查原词
 */
export function expandCityKeywords(keyword: string): string[] {
  const raw = keyword.trim().replace(/\s+/g, ' ')
  if (!raw) return []

  const tokens = raw.split(' ')
  const head = tokens[0] ?? ''
  const candidates = tokens.length > 1 && isProvince(head) ? [tokens[tokens.length - 1]!] : [raw]

  const bases: string[] = []
  for (const candidate of candidates) {
    const trimmed = candidate.trim()
    if (trimmed.length < 2) continue

    const base = stripProvincePrefix(trimmed) || trimmed
    if (!bases.includes(base)) bases.push(base)
  }

  const keywords: string[] = []
  for (const base of bases) {
    keywords.push(base)
    if (CJK_ONLY.test(base) && !CITY_SUFFIX.test(base)) keywords.push(`${base}市`)
  }

  return keywords
}

function cityKey(item: RawCityResult): string {
  if (typeof item.id === 'number') return `id:${item.id}`
  return `${item.name}|${Number(item.latitude).toFixed(3)}|${Number(item.longitude).toFixed(3)}`
}

function populationOf(item: RawCityResult): number {
  return typeof item.population === 'number' && Number.isFinite(item.population) ? item.population : 0
}

/** PPLA / PPLA2 / PPLA3… 表示行政区中心，优先于普通居民点 PPL */
function isAdminCenter(item: RawCityResult): boolean {
  return typeof item.feature_code === 'string' && item.feature_code.startsWith('PPLA')
}

function toCityResult(item: RawCityResult): CityResult {
  const result: CityResult = {
    name: item.name,
    latitude: item.latitude,
    longitude: item.longitude
  }

  if (item.admin1) result.admin1 = item.admin1
  if (item.country) result.country = item.country
  if (item.timezone) result.timezone = item.timezone

  return result
}

/**
 * 合并多路查询结果：去重 → 按人口/行政级别排序 → 截断。
 * 地名库对同名小村庄的召回远好于真正的城市，只靠接口顺序会漏掉省会级城市。
 */
export function mergeCityResults(batches: RawCityResult[][], limit = MAX_RESULTS): CityResult[] {
  const seen = new Set<string>()
  const flattened: Array<{ item: RawCityResult; index: number }> = []

  for (const batch of batches) {
    for (const item of batch) {
      const key = cityKey(item)
      if (seen.has(key)) continue

      seen.add(key)
      flattened.push({ item, index: flattened.length })
    }
  }

  flattened.sort((a, b) => {
    const byPopulation = populationOf(b.item) - populationOf(a.item)
    if (byPopulation !== 0) return byPopulation

    const byAdmin = Number(isAdminCenter(b.item)) - Number(isAdminCenter(a.item))
    if (byAdmin !== 0) return byAdmin

    return a.index - b.index
  })

  return flattened.slice(0, limit).map(({ item }) => toCityResult(item))
}
