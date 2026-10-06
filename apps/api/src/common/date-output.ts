export function toDateTimeOutput(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

export function toDateOutput(value: Date | string): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return toDateTimeOutput(value).slice(0, 10);
}

export function toNullableDateTimeOutput(
  value: Date | string | null | undefined,
): string | null {
  return value == null ? null : toDateTimeOutput(value);
}

export function toNullableDateOutput(
  value: Date | string | null | undefined,
): string | null {
  return value == null ? null : toDateOutput(value);
}
