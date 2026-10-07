import { utcTimestampTransformer } from './utc-timestamp';

describe('transaction UTC calendar storage', () => {
  it('round-trips the submitted UTC fields through pg local timestamp fields', () => {
    const input = new Date('2026-07-01T00:00:00.000Z');
    const persisted = utcTimestampTransformer.to(input) as Date;
    expect(persisted.getFullYear()).toBe(2026);
    expect(persisted.getMonth()).toBe(6);
    expect(persisted.getDate()).toBe(1);
    expect(persisted.getHours()).toBe(0);
    expect(
      (utcTimestampTransformer.from(persisted) as Date).toISOString(),
    ).toBe(input.toISOString());
  });
});
