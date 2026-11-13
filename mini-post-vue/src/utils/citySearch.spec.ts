import { describe, expect, it } from 'vitest'
import { expandCityKeywords, mergeCityResults } from '@/utils/citySearch'
import type { RawCityResult } from '@/utils/citySearch'

function city(overrides: Partial<RawCityResult> = {}): RawCityResult {
  return { name: '长沙', latitude: 30, longitude: 108, ...overrides }
}

describe('expandCityKeywords', () => {
  it('裸城市名补一个「市」变体', () => {
    expect(expandCityKeywords('长沙')).toEqual(['长沙', '长沙市'])
  })

  it('已经带行政区后缀时不重复追加', () => {
    expect(expandCityKeywords('长沙市')).toEqual(['长沙市'])
    expect(expandCityKeywords('长沙县')).toEqual(['长沙县'])
    expect(expandCityKeywords('芙蓉区')).toEqual(['芙蓉区'])
  })

  it('英文或拼音输入不追加中文后缀', () => {
    expect(expandCityKeywords('Changsha')).toEqual(['Changsha'])
    expect(expandCityKeywords('hangzhou')).toEqual(['hangzhou'])
    expect(expandCityKeywords('New York')).toEqual(['New York'])
  })

  it('剥掉省级前缀后再补「市」变体', () => {
    expect(expandCityKeywords('湖南长沙')).toEqual(['长沙', '长沙市'])
    expect(expandCityKeywords('湖南省长沙市')).toEqual(['长沙市'])
    expect(expandCityKeywords('浙江杭州')).toEqual(['杭州', '杭州市'])
    expect(expandCityKeywords('广西桂林')).toEqual(['桂林', '桂林市'])
  })

  it('空格分隔的「省 市」取城市部分', () => {
    expect(expandCityKeywords('湖南 长沙')).toEqual(['长沙', '长沙市'])
    expect(expandCityKeywords(' 湖南  长沙 ')).toEqual(['长沙', '长沙市'])
  })

  it('省级名称本身不被误剥', () => {
    expect(expandCityKeywords('吉林')).toEqual(['吉林', '吉林市'])
    expect(expandCityKeywords('吉林市')).toEqual(['吉林市'])
    expect(expandCityKeywords('北京')).toEqual(['北京', '北京市'])
  })

  it('空输入返回空数组', () => {
    expect(expandCityKeywords('')).toEqual([])
    expect(expandCityKeywords('   ')).toEqual([])
  })
})

describe('mergeCityResults', () => {
  const villages: RawCityResult[] = [
    city({ id: 1, name: '长沙', admin1: '重庆市', population: 47170, feature_code: 'PPLA4' }),
    city({ id: 2, name: '长沙', admin1: '贵州', population: 1653, feature_code: 'PPLA4' }),
    city({ id: 3, name: '长沙', admin1: '广东', feature_code: 'PPLA4', latitude: 24.2, longitude: 116.1 })
  ]

  const changshaCity: RawCityResult[] = [
    city({
      id: 9,
      name: '长沙市',
      admin1: '湖南',
      country: '中国',
      population: 3093980,
      feature_code: 'PPLA',
      latitude: 28.19874,
      longitude: 112.97087,
      timezone: 'Asia/Shanghai'
    })
  ]

  it('按人口排序，湖南长沙市排在同名村庄之前', () => {
    const merged = mergeCityResults([villages, changshaCity])

    expect(merged[0]!.name).toBe('长沙市')
    expect(merged[0]!.admin1).toBe('湖南')
    expect(merged.map((item) => item.name)).toEqual(['长沙市', '长沙', '长沙', '长沙'])
  })

  it('缺少人口时视为 0，排在人后的后面', () => {
    const merged = mergeCityResults([villages])

    expect(merged.map((item) => item.admin1)).toEqual(['重庆市', '贵州', '广东'])
  })

  it('人口相同时行政中心（PPLA）优先于普通地点（PPL）', () => {
    const merged = mergeCityResults([
      [
        city({ id: 11, name: '湘潭', admin1: '安徽', feature_code: 'PPL', latitude: 30.1, longitude: 118.1 }),
        city({ id: 12, name: '湘潭', admin1: '湖南', feature_code: 'PPLA2', latitude: 27.83, longitude: 112.94 })
      ]
    ])

    expect(merged.map((item) => item.admin1)).toEqual(['湖南', '安徽'])
  })

  it('同一 id 的结果去重', () => {
    const merged = mergeCityResults([changshaCity, changshaCity])

    expect(merged).toHaveLength(1)
  })

  it('缺少 id 时按名称与坐标去重', () => {
    const merged = mergeCityResults([
      [city({ name: '桂林', latitude: 25.28, longitude: 110.29 })],
      [city({ name: '桂林', latitude: 25.28, longitude: 110.29 })]
    ])

    expect(merged).toHaveLength(1)
  })

  it('结果只保留渲染所需字段', () => {
    const merged = mergeCityResults([changshaCity])

    expect(merged[0]).toEqual({
      name: '长沙市',
      latitude: 28.19874,
      longitude: 112.97087,
      admin1: '湖南',
      country: '中国',
      timezone: 'Asia/Shanghai'
    })
  })

  it('最多返回 8 条', () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      city({ id: 100 + index, name: `城${index}`, latitude: 20 + index, longitude: 100 + index })
    )

    expect(mergeCityResults([many])).toHaveLength(8)
  })
})
