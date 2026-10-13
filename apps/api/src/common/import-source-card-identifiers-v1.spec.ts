import { ImportMappingConfig } from '@fina/types';
import { readImportSourceCardIdentifiers } from './import-source-card-identifiers-v1';

const config: ImportMappingConfig = {
  version: 1,
  delimiter: ';',
  encoding: 'utf-8',
  hasHeader: true,
  dateFormat: 'DD/MM/YYYY',
  numberFormat: 'decimal-comma',
  dateColumn: 0,
  descriptionColumns: [1],
  installmentColumn: null,
  amountMode: 'signed',
  amountColumn: 2,
  debitColumn: null,
  creditColumn: null,
  chargesPositive: false,
  creditCardColumn: 3,
};

describe('retained version-one card identifier parsing', () => {
  it('uses physical source lines across quoted delimiters, multiline fields, BOM, CRLF, and escaped quotes', () => {
    const source = Buffer.from(
      '\uFEFFDate;Description;Amount;Card\r\n20/06/2026;"Synthetic; item\nsecond line";10;" Mine "\r\n21/06/2026;Synthetic;5;"Spouse ""virtual"""\r\n22/06/2026;Synthetic;2;\r\n',
    );
    expect([...readImportSourceCardIdentifiers(source, config)]).toEqual([
      [1, 'Card'],
      [2, 'Mine'],
      [4, 'Spouse "virtual"'],
      [5, ''],
    ]);
  });

  it('does not turn absent source cells into a blank fallback and rejects malformed quoting', () => {
    expect(
      readImportSourceCardIdentifiers(
        Buffer.from('Date;Description;Amount\n20/06/2026;Synthetic;10'),
        config,
      ).size,
    ).toBe(0);
    expect(() =>
      readImportSourceCardIdentifiers(
        Buffer.from('20/06/2026;"Synthetic;10;Mine'),
        config,
      ),
    ).toThrow();
  });
});
