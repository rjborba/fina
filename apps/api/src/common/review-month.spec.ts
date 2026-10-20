import { shiftReviewMonth } from './review-month';

describe('calculated bill review months', () => {
  it('moves January into the previous year without changing the bill identity', () => {
    expect(shiftReviewMonth('2027-01', -1)).toBe('2026-12');
    expect(shiftReviewMonth('2026-07', -1)).toBe('2026-06');
    expect(shiftReviewMonth('2026-07', 0)).toBe('2026-07');
    expect(shiftReviewMonth('2026-02', -1)).toBe('2026-01');
    expect(shiftReviewMonth('2024-03', -1)).toBe('2024-02');
  });
});
