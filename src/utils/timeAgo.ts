// Turns an ISO timestamp into a short age like "5m", "3h" or "2d"
export function timeAgo(published: string) {
  const minutes = Math.floor((Date.now() - new Date(published).getTime()) / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
