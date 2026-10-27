// In-app formatting for user code. Prettier only parses and prints; the code is
// never executed. The result is accepted only if it parses to the same program.
import { parseProgram } from '../engine/parse';

/** Matches the style of the built-in examples. */
export const USER_CODE_STYLE = { singleQuote: true, semi: true, trailingComma: 'all', printWidth: 80, tabWidth: 2 } as const;

export type FormatResult =
  { ok: true; code: string; cursorOffset: number; changed: boolean } | { ok: false; message: string; line: number | null };

/** The program's syntax tree without positions, raw spellings or comments. */
function shape(code: string): string | null {
  const parsed = parseProgram(code);
  if (!parsed.ok) return null;
  return JSON.stringify(parsed.program, (key, value) => (['start', 'end', 'loc', 'range', 'raw'].includes(key) ? undefined : value));
}

export async function formatJavaScript(code: string, cursorOffset = 0): Promise<FormatResult> {
  const parsed = parseProgram(code);
  if (!parsed.ok) {
    const line = parsed.error.loc?.line ?? null;
    return {
      ok: false,
      line,
      message: `Not formatted: line ${line ?? '?'} has a syntax error (${parsed.error.message}). Your code was left unchanged.`,
    };
  }
  const [prettier, acorn, estree] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/acorn'),
    import('prettier/plugins/estree'),
  ]);
  let result: { formatted: string; cursorOffset: number };
  try {
    result = await prettier.formatWithCursor(code, {
      cursorOffset: Math.max(0, Math.min(cursorOffset, code.length)),
      parser: 'acorn',
      plugins: [acorn, estree],
      ...USER_CODE_STYLE,
    });
  } catch (e) {
    return {
      ok: false,
      line: null,
      message: `Not formatted: Prettier could not format this code (${(e as Error).message.split('\n')[0]}). Your code was left unchanged.`,
    };
  }
  const before = shape(code);
  const after = shape(result.formatted);
  if (!after || before !== after) {
    return { ok: false, line: null, message: 'Not formatted: the result would not be the same program, so your code was left unchanged.' };
  }
  return { ok: true, code: result.formatted, cursorOffset: result.cursorOffset, changed: result.formatted !== code };
}
