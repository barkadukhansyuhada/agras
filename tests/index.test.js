/**
 * Testing framework: Jest (expect/describe/test with Node test environment).
 *
 * Focus: Pure utility functions defined inline in the project's HTML entry
 *        (formatCurrency, formatNumber, isDateColumn, isNumericValue, convertToObjects).
 *
 * Strategy:
 *  - Load the HTML file that contains the inline script (React + Babel section).
 *  - Extract only the "Utility functions" section by string slicing using markers.
 *  - Evaluate that code snippet in isolation via new Function and return the functions.
 *  - Write comprehensive tests: happy paths, edge cases, and failure conditions.
 *
 * Note:
 *  This test does not require executing React/JSX, nor Babel; it deliberately avoids the JSX (TestChart) part.
 *  It purely validates the utility functions' behavior as implemented in the HTML file.
 */

const fs = require('fs');
const path = require('path');
const { pickHtmlFile } = require('./__htmlPath__');

function extractUtilityFunctionsFromHtml(htmlContent) {
  // Identify the <script type="text/babel"> block containing utility functions.
  // Use robust markers present in the source:
  //  - Start: "// Utility functions"
  //  - End: "const TestChart" (appears after convertToObjects)
  //
  // We extract code strictly between these markers.
  const startMarker = /\/\/\s*Utility functions/;
  const endMarker = /const\s+TestChart/;

  const startMatch = startMarker.exec(htmlContent);
  const endMatch = endMarker.exec(htmlContent);
  if (!startMatch || !endMatch || endMatch.index <= startMatch.index) {
    throw new Error('Could not locate utility functions block in the HTML content.');
  }

  const snippet = htmlContent.slice(startMatch.index, endMatch.index);
  // The snippet includes comment line; trim and ensure it defines the functions we need.
  if (!/formatCurrency/.test(snippet) ||
      !/formatNumber/.test(snippet) ||
      !/isDateColumn/.test(snippet) ||
      !/isNumericValue/.test(snippet) ||
      !/convertToObjects/.test(snippet)) {
    throw new Error('Utility functions are incomplete or missing in the extracted snippet.');
  }
  return snippet;
}

function buildUtilityModule(snippet) {
  // Wrap the extracted code and return the functions via new Function
  // Note: The snippet uses only standard JS, so it should evaluate without Babel.
  const factory = new Function(`
    "use strict";
    ${snippet}
    return { formatCurrency, formatNumber, isDateColumn, isNumericValue, convertToObjects };
  `);
  return factory();
}

describe('Utility functions from HTML inline script', () => {
  let htmlFilePath;
  let htmlContent;
  let utils;

  beforeAll(() => {
    htmlFilePath = pickHtmlFile();
    if (!htmlFilePath) {
      throw new Error('Unable to locate an HTML file in the repository to extract utility functions from.');
    }
    htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    const snippet = extractUtilityFunctionsFromHtml(htmlContent);
    utils = buildUtilityModule(snippet);
  });

  describe('formatCurrency', () => {
    test('returns "-" for null, undefined, and NaN', () => {
      expect(utils.formatCurrency(null)).toBe('-');
      expect(utils.formatCurrency(undefined)).toBe('-');
      expect(utils.formatCurrency(NaN)).toBe('-');
    });

    test('formats positive integers as IDR without decimals', () => {
      const formatted = utils.formatCurrency(1234567);
      // Expect Indonesian Rupiah format with thousand separators and no decimals, e.g., "Rp 1.234.567"
      expect(formatted).toMatch(/^Rp\s?\d{1,3}(\.\d{3})*$/);
      expect(formatted.includes('.')).toBe(true);
    });

    test('formats zero and negative numbers correctly', () => {
      expect(utils.formatCurrency(0)).toMatch(/^Rp\s?0$/);
      const negative = utils.formatCurrency(-98765);
      // Some environments may format negatives as "-Rp 98.765" or "Rp -98.765".
      // Accept both patterns but ensure digits and separators are present.
      expect(negative.replace(/\s/g, '')).toMatch(/^(-?Rp-?\d{1,3}(\.\d{3})*|-?Rp-?0)$/);
    });

    test('accepts numeric strings that represent numbers', () => {
      // Since the function checks isNaN(value), "1234" is acceptable (isNaN("1234") is false)
      const formatted = utils.formatCurrency("1234");
      expect(formatted).toMatch(/^Rp\s?1\.234$/);
    });

    test('returns "-" for non-numeric strings', () => {
      expect(utils.formatCurrency("abc")).toBe('-');
    });

    test('rounds values to zero decimals', () => {
      const formatted = utils.formatCurrency(1234.9);
      expect(formatted).toMatch(/^Rp\s?1\.235$/); // rounded up
      const formattedDown = utils.formatCurrency(1234.4);
      expect(formattedDown).toMatch(/^Rp\s?1\.234$/); // rounded down
    });
  });

  describe('formatNumber', () => {
    test('returns "-" for null, undefined, and NaN', () => {
      expect(utils.formatNumber(null)).toBe('-');
      expect(utils.formatNumber(undefined)).toBe('-');
      expect(utils.formatNumber(NaN)).toBe('-');
    });

    test('formats integers with thousands separators (id-ID)', () => {
      expect(utils.formatNumber(1000)).toBe('1.000');
      expect(utils.formatNumber(1234567)).toBe('1.234.567');
    });

    test('accepts numeric strings and rejects non-numeric strings', () => {
      expect(utils.formatNumber("12345")).toBe('12.345');
      expect(utils.formatNumber("12.34xyz")).toBe('-');
    });
  });

  describe('isDateColumn', () => {
    test('detects "tanggal" in various cases', () => {
      expect(utils.isDateColumn('Tanggal Transaksi')).toBe(true);
      expect(utils.isDateColumn('tAngGal')).toBe(true);
    });

    test('detects "date" substrings', () => {
      expect(utils.isDateColumn('Date Created')).toBe(true);
      expect(utils.isDateColumn('last_updated_date')).toBe(true);
    });

    test('detects "Bulan <number>" patterns', () => {
      expect(utils.isDateColumn('Bulan 1')).toBe(true);
      expect(utils.isDateColumn('bulan   12')).toBe(true);
      expect(utils.isDateColumn('BULAN10')).toBe(true);
    });

    test('does not match "Bulan" without a number or unrelated headers', () => {
      expect(utils.isDateColumn('Bulan')).toBe(false);
      expect(utils.isDateColumn('Item')).toBe(false);
      expect(utils.isDateColumn('Jumlah')).toBe(false);
    });
  });

  describe('isNumericValue', () => {
    test('returns true for finite numbers and false for NaN', () => {
      expect(utils.isNumericValue(0)).toBe(true);
      expect(utils.isNumericValue(1.23)).toBe(true);
      expect(utils.isNumericValue(NaN)).toBe(false);
    });

    test('returns false for non-number types and boxed numbers', () => {
      expect(utils.isNumericValue('123')).toBe(false);
      expect(utils.isNumericValue(null)).toBe(false);
      expect(utils.isNumericValue(undefined)).toBe(false);
      // Boxed Number is an object, not typeof === 'number'
      // eslint-disable-next-line no-new-wrappers
      expect(utils.isNumericValue(new Number(5))).toBe(false);
    });
  });

  describe('convertToObjects', () => {
    test('converts compact sheet data using headers to an array of objects', () => {
      const compact = {
        Sheet1: {
          headers: ['A', 'B', 'C'],
          data: [
            [1, 2, 3],
            [4, 5, 6],
          ],
        }
      };
      const result = utils.convertToObjects(compact);
      expect(Array.isArray(result.Sheet1)).toBe(true);
      expect(result.Sheet1).toEqual([
        { A: 1, B: 2, C: 3 },
        { A: 4, B: 5, C: 6 },
      ]);
    });

    test('passes through sheets without headers/data unchanged', () => {
      const compact = {
        Raw: [1, 2, 3],
        Sheet1: {
          headers: ['A', 'B'],
          data: [[1, 2]],
        }
      };
      const result = utils.convertToObjects(compact);
      expect(result.Raw).toEqual([1, 2, 3]);
      expect(result.Sheet1).toEqual([{ A: 1, B: 2 }]);
    });

    test('handles rows with fewer or more values than headers gracefully', () => {
      const compact = {
        Mixed: {
          headers: ['Col1', 'Col2', 'Col3'],
          data: [
            [10, 20],           // shorter than headers -> Col3 becomes undefined
            [1, 2, 3, 4, 5],    // longer than headers -> extra ignored
          ],
        }
      };
      const result = utils.convertToObjects(compact);
      expect(result.Mixed[0]).toEqual({ Col1: 10, Col2: 20, Col3: undefined });
      expect(result.Mixed[1]).toEqual({ Col1: 1, Col2: 2, Col3: 3 });
    });

    test('returns an object with same sheet keys', () => {
      const compact = {
        A: { headers: ['H'], data: [[1]] },
        B: { headers: ['X', 'Y'], data: [[9, 8]] },
      };
      const result = utils.convertToObjects(compact);
      expect(Object.keys(result).sort()).toEqual(['A', 'B']);
    });
  });
});