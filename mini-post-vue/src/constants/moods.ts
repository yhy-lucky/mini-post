import type { Mood, MoodId } from '@/types'

export const MOODS: readonly Mood[] = [
  {
    id: 'happy',
    label: '开心',
    color: '#F59E0B',
    path: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM9.2 9.8h.01M14.8 9.8h.01M8.6 14.2c.9 1.3 2.1 2 3.4 2s2.5-.7 3.4-2'
  },
  {
    id: 'calm',
    label: '平静',
    color: '#5B5BF6',
    path: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM8.5 10.4c.5-.5 1.2-.5 1.7 0M13.8 10.4c.5-.5 1.2-.5 1.7 0M9.4 14.8c.7.6 1.6.9 2.6.9s1.9-.3 2.6-.9'
  },
  {
    id: 'excited',
    label: '兴奋',
    color: '#EC4899',
    path: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM8.4 9.4l1.5 1-1.5 1M15.6 9.4l-1.5 1 1.5 1M8.4 14.2c1 1.6 2.3 2.4 3.6 2.4s2.6-.8 3.6-2.4'
  },
  {
    id: 'tired',
    label: '疲惫',
    color: '#8B90A6',
    path: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM8.4 9.6h2.3M13.3 9.6h2.3M9.4 15h5.2'
  },
  {
    id: 'sad',
    label: '低落',
    color: '#3B82F6',
    path: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM9.2 9.8h.01M14.8 9.8h.01M8.6 16.6c.9-1.3 2.1-2 3.4-2s2.5.7 3.4 2'
  },
  {
    id: 'anxious',
    label: '焦虑',
    color: '#8B5CF6',
    path: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6zM9.2 9.6h.01M14.8 9.6h.01M8.8 15.6c.7-.9 1.4.9 2.1 0s1.4.9 2.1 0 1.4.9 2.1 0'
  }
]

export const DEFAULT_MOOD_ID: MoodId = 'calm'

/** 未知心情回退到「平静」，与旧版一致 */
export function getMood(id: string | undefined | null): Mood {
  return MOODS.find((mood) => mood.id === id) ?? MOODS[1]!
}
