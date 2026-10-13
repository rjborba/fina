export function reviewMonthFromDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export function reviewMonthStart(month: string): Date {
  const [year, calendarMonth] = month.split("-").map(Number)
  const date = new Date(0)
  date.setFullYear(year, calendarMonth - 1, 1)
  date.setHours(0, 0, 0, 0)
  return date
}

export function reviewMonthEnd(month: string): Date {
  const date = reviewMonthStart(month)
  date.setMonth(date.getMonth() + 1)
  date.setDate(0)
  date.setHours(23, 59, 59, 999)
  return date
}

export function shiftReviewMonth(month: string, offset: number): string {
  const [year, calendarMonth] = month.split("-").map(Number)
  const monthIndex = year * 12 + calendarMonth - 1 + offset
  return `${String(Math.floor(monthIndex / 12)).padStart(4, "0")}-${String((monthIndex % 12) + 1).padStart(2, "0")}`
}
