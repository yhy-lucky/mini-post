import { MIDDAY_HOUR } from '@/constants/date'

export function pad(num: number): string {
  return num < 10 ? `0${num}` : String(num)
}

/** 本地时区的 YYYY-MM-DD */
export function dateKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 固定到当天的正午再位移，规避夏令时与边界抖动 */
export function shiftDay(date: Date, delta: number): Date {
  const copy = new Date(date)
  copy.setHours(MIDDAY_HOUR, 0, 0, 0)
  copy.setDate(copy.getDate() + delta)
  return copy
}

export function dayLabel(key: string, now: number = Date.now()): string {
  if (key === dateKey(now)) return '今天'
  if (key === dateKey(shiftDay(new Date(now), -1).getTime())) return '昨天'

  const [, month = '0', day = '0'] = key.split('-')
  return `${Number(month)} 月 ${Number(day)} 日`
}

export function greetingFor(hour: number): string {
  if (hour < 5) return '夜深了，早点休息'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 23) return '晚上好'
  return '夜深了，早点休息'
}
