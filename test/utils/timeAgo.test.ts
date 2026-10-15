import { describe, expect, it } from '@jest/globals'
import { timeAgo } from '../../src/utils/timeAgo.ts'

// A timestamp this many minutes in the past
function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60000).toISOString()
}

describe('timeAgo', () => {
  it('shows minutes under an hour', () => {
    expect(timeAgo(minutesAgo(5))).toBe('5m')
  })

  it('shows hours under a day', () => {
    expect(timeAgo(minutesAgo(3 * 60))).toBe('3h')
  })

  it('shows days after that', () => {
    expect(timeAgo(minutesAgo(2 * 24 * 60))).toBe('2d')
  })
})
