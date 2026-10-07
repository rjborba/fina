import { ValueTransformer } from 'typeorm';

/** PostgreSQL's timestamp-without-time-zone represents the stored calendar
 * fields. pg encodes/decodes Date objects in the process timezone; translate
 * those local fields explicitly so the API's UTC contract is host-independent.
 * Apply only to dates explicitly written with date_is_utc=true. Legacy rows
 * retain their original host-local pg Date semantics and are never rewritten. */
export const utcTimestampTransformer: ValueTransformer = {
  to(value: Date | string | null | undefined): Date | null | undefined {
    if (value == null) return value;
    const date = value instanceof Date ? value : new Date(value);
    const local = new Date(date);
    local.setFullYear(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
    local.setHours(
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    );
    return local;
  },
  from(value: Date | null | undefined): Date | null | undefined {
    if (value == null) return value;
    const utc = new Date(value);
    utc.setUTCFullYear(value.getFullYear(), value.getMonth(), value.getDate());
    utc.setUTCHours(
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
      value.getMilliseconds(),
    );
    return utc;
  },
};

export function transactionOccurrenceDateSql(
  alias: string,
  timezoneParameter: string,
): string {
  return `(CASE WHEN ${alias}.date_is_utc THEN ${alias}.date::date
    ELSE ((${alias}.date AT TIME ZONE ${timezoneParameter}) AT TIME ZONE 'UTC')::date END)`;
}

export function legacyTimestampTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function transactionOccurrenceDate(
  record:
    | { date: Date | string | null; dateIsUtc?: boolean }
    | null
    | undefined,
): Date | string | null {
  if (!record?.date) return null;
  return record.dateIsUtc && record.date instanceof Date
    ? (utcTimestampTransformer.from(record.date) as Date)
    : record.date;
}
