import { MIDDAY_HOUR } from '@/constants/date'
import { MOODS } from '@/constants/moods'
import { dateKey, pad, shiftDay } from '@/utils/date'
import type { Entry, EntryStats, MoodId } from '@/types'

function emptyMoodCounts(): Record<MoodId, number> {
  const counts = {} as Record<MoodId, number>
  for (const mood of MOODS) counts[mood.id] = 0
  return counts
}

/**
 * 一次遍历得出：本月记录天数、本月条数、累计条数、连续天数与本月心情分布。
 * 连续天数：从今天（今天无记录则从昨天）起，向前累计不间断的打卡天数。
 */
export function computeStats(entries: Entry[], now: number = Date.now()): EntryStats {
  const current = new Date(now)
  const monthPrefix = `${current.getFullYear()}-${pad(current.getMonth() + 1)}`

  const allDays = new Set<string>()
  const monthDays = new Set<string>()
  const moodCounts = emptyMoodCounts()
  let monthEntries = 0

  for (const entry of entries) {
    const key = dateKey(entry.createdAt)
    allDays.add(key)

    if (!key.startsWith(monthPrefix)) continue

    monthDays.add(key)
    monthEntries += 1
    if (entry.mood in moodCounts) moodCounts[entry.mood] += 1
  }

  const cursor = new Date(now)
  cursor.setHours(MIDDAY_HOUR, 0, 0, 0)
  let streakCursor = allDays.has(dateKey(cursor.getTime())) ? cursor : shiftDay(cursor, -1)

  let streak = 0
  while (allDays.has(dateKey(streakCursor.getTime()))) {
    streak += 1
    streakCursor = shiftDay(streakCursor, -1)
  }

  return {
    monthDays: monthDays.size,
    monthEntries,
    total: entries.length,
    streak,
    moodCounts
  }
}
