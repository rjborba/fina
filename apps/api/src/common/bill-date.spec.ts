import { deriveBillDueDate } from './bill-date';

describe('deriveBillDueDate', () => {
  it('combines bill month with the configured account due day', () => {
    expect(deriveBillDueDate(5, '2026-10')).toBe('2026-10-05');
  });

  it('uses the last calendar day when the configured day does not exist', () => {
    expect(deriveBillDueDate(31, '2026-02')).toBe('2026-02-28');
    expect(deriveBillDueDate(31, '2028-02')).toBe('2028-02-29');
  });
});
