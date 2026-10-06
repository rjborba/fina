export function deriveBillDueDate(
  accountDueDay: number,
  billMonth: string,
): string {
  const [year, month] = billMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(accountDueDay, lastDay);
  return `${billMonth}-${String(day).padStart(2, '0')}`;
}
