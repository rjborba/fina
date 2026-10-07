import { ImportMappingConfig } from '@fina/types';

// Version-one CSV parsing is kept stable because retained imports and the
// amount-sign data migration rely on the original physical source-line mapping.
export function readImportSourceAmounts(
  content: Uint8Array,
  config: ImportMappingConfig,
): Map<number, number> {
  if (config.amountMode !== 'signed' || config.amountColumn === null) {
    throw new Error('A signed source amount column is required');
  }
  const text = new TextDecoder(config.encoding)
    .decode(content)
    .replace(/^\uFEFF/, '');
  const amounts = new Map<number, number>();
  let cells: string[] = [];
  let field = '';
  let inQuotes = false;
  let sourceLine = 1;
  let currentLine = 1;
  const finishRecord = () => {
    cells.push(field);
    const amount = parseSourceNumber(
      cells[config.amountColumn!] ?? '',
      config.numberFormat,
    );
    if (amount !== null) amounts.set(sourceLine, amount);
    cells = [];
    field = '';
    sourceLine = currentLine + 1;
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += character;
        if (character === '\n') currentLine += 1;
      }
      continue;
    }
    if (character === '"' && field.length === 0) {
      inQuotes = true;
    } else if (character === config.delimiter) {
      cells.push(field);
      field = '';
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      finishRecord();
      currentLine += 1;
    } else {
      field += character;
    }
  }
  if (inQuotes)
    throw new Error('The retained CSV has an unclosed quoted field');
  if (field.length > 0 || cells.length > 0 || text.length === 0) finishRecord();
  return amounts;
}

function parseSourceNumber(
  input: string,
  format: ImportMappingConfig['numberFormat'],
): number | null {
  let value = input.trim().replace(/\u00a0/g, '');
  if (!value) return null;
  let negativeByParentheses = false;
  if (value.startsWith('(') && value.endsWith(')')) {
    negativeByParentheses = true;
    value = value.slice(1, -1).trim();
  }
  const decimal = format === 'decimal-comma' ? ',' : '.';
  const grouping = format === 'decimal-comma' ? '.' : ',';
  const escapedDecimal = decimal === '.' ? '\\.' : decimal;
  const escapedGrouping = grouping === '.' ? '\\.' : grouping;
  const pattern = new RegExp(
    `^[+-]?(?:\\d{1,3}(?:${escapedGrouping}\\d{3})+|\\d+)(?:${escapedDecimal}\\d+)?$`,
  );
  if (!pattern.test(value)) return null;
  const parsed = Number(value.split(grouping).join('').replace(decimal, '.'));
  if (
    !Number.isFinite(parsed) ||
    !Number.isSafeInteger(Math.round(parsed * 100))
  ) {
    return null;
  }
  const result = negativeByParentheses ? -Math.abs(parsed) : parsed;
  return Math.abs(result) <= 1_000_000_000_000 ? result : null;
}
