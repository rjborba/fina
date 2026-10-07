import { ImportMappingConfig } from '@fina/types';
import { readImportSourceAmounts } from './import-source-amounts-v1';

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
  chargesPositive: true,
};

describe('retained version-one CSV amount parsing', () => {
  it('keeps physical source lines across BOM, preamble, quoted delimiters and multiline fields', () => {
    const source = Buffer.from(
      '\uFEFFPreamble\r\nDate;Description;Amount\r\n' +
        '01/07/2026;"Synthetic; charge";25,00\r\n' +
        '02/07/2026;"Synthetic ""refund""\ncontinued";(1.234,56)\r\n' +
        '03/07/2026;Zero;-0\r\n',
    );
    expect([...readImportSourceAmounts(source, config)]).toEqual([
      [3, 25],
      [4, -1234.56],
      [6, -0],
    ]);
  });

  it('supports windows-1252, no header, alternate delimiters, and decimal-point amounts', () => {
    const source = Buffer.from(
      '01/07/2026|Synth\xe9tic|-1,234.125\r02/07/2026|Zero|+0',
      'latin1',
    );
    expect([
      ...readImportSourceAmounts(source, {
        ...config,
        encoding: 'windows-1252',
        delimiter: '|',
        numberFormat: 'decimal-point',
        hasHeader: false,
      }),
    ]).toEqual([
      [1, -1234.125],
      [2, 0],
    ]);
  });

  it('does not guess malformed or out-of-range amounts and rejects unclosed quotes', () => {
    const source = Buffer.from(
      '1;Synthetic;1,23,45\n2;Synthetic;NaN\n3;Synthetic;1000000000001\n4;Synthetic;',
    );
    expect(readImportSourceAmounts(source, config).size).toBe(0);
    expect(() =>
      readImportSourceAmounts(Buffer.from('1;"Synthetic;25'), config),
    ).toThrow('unclosed quoted field');
  });
});
