/** 按码点计数（emoji 算 1 个字），与旧版 Array.from 语义一致 */
export function countChars(text: string): number {
  return Array.from(text).length
}
