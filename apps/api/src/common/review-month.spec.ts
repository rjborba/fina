import { shiftReviewMonth } from './review-month';

describe('bill reference month defaults', () => {
  it('moves January into the previous year without changing the bill identity', () => {
    expect(shiftReviewMonth('2027-01', -1)).toBe('2026-12');
    expect(shiftReviewMonth('2026-07', -1)).toBe('2026-06');
    expect(shiftReviewMonth('2026-07', 0)).toBe('2026-07');
  });
});
