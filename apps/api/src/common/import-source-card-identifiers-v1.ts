import { ImportMappingConfig } from '@fina/types';

// Keep physical source-line indexing compatible with the retained v1 parser.
// Only the selected identifier cell is read; no customer values are logged.
export function readImportSourceCardIdentifiers(
  content: Uint8Array,
  config: ImportMappingConfig,
): Map<number, string> {
  if (config.creditCardColumn == null)
    throw new Error('A card column is required');
  const text = new TextDecoder(config.encoding)
    .decode(content)
    .replace(/^\uFEFF/, '');
  const identifiers = new Map<number, string>();
  let cells: string[] = [];
  let field = '';
  let inQuotes = false;
  let sourceLine = 1;
  let currentLine = 1;
  const finishRecord = () => {
    cells.push(field);
    const identifier = cells[config.creditCardColumn!];
    if (identifier !== undefined)
      identifiers.set(sourceLine, identifier.trim());
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
        } else inQuotes = false;
      } else {
        field += character;
        if (character === '\n') currentLine += 1;
      }
      continue;
    }
    if (character === '"' && field.length === 0) inQuotes = true;
    else if (character === config.delimiter) {
      cells.push(field);
      field = '';
    } else if (character === '\r' || character === '\n') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      finishRecord();
      currentLine += 1;
    } else field += character;
  }
  if (inQuotes) throw new Error('The CSV has an unclosed quoted field');
  if (field.length > 0 || cells.length > 0 || text.length === 0) finishRecord();
  return identifiers;
}
