import { ImportMappingConfig } from '@fina/types';
import { readImportSourceColumn } from './import-source-column-v1';

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
};

describe('retained version-one card identifier parsing', () => {
  it('uses physical source lines across quoted delimiters, multiline fields, BOM, CRLF, and escaped quotes', () => {
    const source = Buffer.from(
      '\uFEFFDate;Description;Amount;Card\r\n20/06/2026;"Synthetic; item\nsecond line";10;" Mine "\r\n21/06/2026;Synthetic;5;"Spouse ""virtual"""\r\n22/06/2026;Synthetic;2;\r\n',
    );
    expect([...readImportSourceColumn(source, config, 3)]).toEqual([
      [1, 'Card'],
      [2, 'Mine'],
      [4, 'Spouse "virtual"'],
      [5, ''],
    ]);
  });

  it('does not turn absent source cells into a blank fallback and rejects malformed quoting', () => {
    expect(
      readImportSourceColumn(
        Buffer.from('Date;Description;Amount\n20/06/2026;Synthetic;10'),
        config,
        3,
      ).size,
    ).toBe(0);
    expect(() =>
      readImportSourceColumn(
        Buffer.from('20/06/2026;"Synthetic;10;Mine'),
        config,
        3,
      ),
    ).toThrow();
  });
});
