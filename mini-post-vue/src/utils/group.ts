import { WEEKDAYS } from '@/constants/date'
import { dateKey, dayLabel } from '@/utils/date'
import type { Entry } from '@/types'

export interface EntryGroup {
  /** YYYY-MM-DD */
  key: string
  /** 今天 / 昨天 / M 月 D 日 */
  label: string
  /** 星期几 */
  weekday: string
  items: Entry[]
}

/** 按日期把「已按时间倒序」的条目切成连续分组 */
export function groupEntriesByDay(entries: Entry[], now: number = Date.now()): EntryGroup[] {
  const groups: EntryGroup[] = []

  for (const entry of entries) {
    const key = dateKey(entry.createdAt)
    const last = groups[groups.length - 1]

    if (last && last.key === key) {
      last.items.push(entry)
      continue
    }

    groups.push({
      key,
      label: dayLabel(key, now),
      weekday: WEEKDAYS[new Date(entry.createdAt).getDay()] ?? '',
      items: [entry]
    })
  }

  return groups
}
