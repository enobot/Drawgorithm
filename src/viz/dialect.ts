// The board writes values in the words of the language the drawn code was written in:
// None, True and inf for Python; null, true and Infinity for JavaScript. Views read it with
// useDialect (dialectContext.ts): App sets it from the code on screen, and VizPanel sets the Run
// tab's from the run it shows. The pure formatters in analysis.ts, structures.ts and bindings.ts
// take it as an argument, JavaScript by default.
import type { LanguageId } from '../languages';

export type Dialect = 'javascript' | 'python';

export const dialectOf = (language: LanguageId): Dialect => (language === 'python' ? 'python' : 'javascript');

/** The value that means "nothing here": null in JavaScript, None in Python. */
export const noneWord = (dialect: Dialect) => (dialect === 'python' ? 'None' : 'null');

export const boolWord = (v: boolean, dialect: Dialect) => (dialect === 'python' ? (v ? 'True' : 'False') : String(v));

/** A number as the language prints it: Python writes inf, -inf and nan. */
export function numberWord(v: number, dialect: Dialect): string {
  if (Object.is(v, -0)) return '0';
  if (dialect === 'python' && !Number.isFinite(v)) return Number.isNaN(v) ? 'nan' : v > 0 ? 'inf' : '-inf';
  return String(v);
}

/** A string literal as the language prints it: Python's repr uses single quotes unless the text has one and no double quote. */
export function stringWord(s: string, dialect: Dialect): string {
  if (dialect !== 'python') return JSON.stringify(s);
  const quote = s.includes("'") && !s.includes('"') ? '"' : "'";
  const escaped = s.replace(/[\\\n\r\t]/g, (c) => ({ '\\': '\\\\', '\n': '\\n', '\r': '\\r', '\t': '\\t' })[c]!);
  return quote + escaped.replaceAll(quote, `\\${quote}`) + quote;
}
