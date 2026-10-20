export function shiftReviewMonth(billMonth: string, offset: number): string {
  const date = new Date(`${billMonth}-01T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}
