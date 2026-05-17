export function formatRelativeTime(value: string) {
  const date = new Date(value)
  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))

  if (diffSeconds < 60) return 'たった今'

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}分前`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}時間前`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}日前`

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}
