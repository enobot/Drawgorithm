// Size limits that keep one runaway program from exhausting the engine's memory, and
// that keep the step-by-step trace small enough to copy to the page.
import { describe, expect, it } from 'vitest';
import { runProgram } from './run';

const script = (code: string) => runProgram({ code, mode: 'script', inputs: [] });

describe('string length limit', () => {
  const tooLong = /Strings are limited to 1,000,000 characters/;

  it.each([
    ['+ in a loop', 'let s = "x"; for (let i = 0; i < 31; i++) { s = s + s; }'],
    ['+= in a loop', 'let s = "x"; for (let i = 0; i < 31; i++) { s += s; }'],
    ['a template literal', 'let s = "x"; for (let i = 0; i < 31; i++) { s = `${s}${s}`; }'],
    ['padStart', 'const s = "x".padStart(300000000, "y");'],
    ['padEnd', 'const s = "x".padEnd(300000000);'],
    ['join', 'const parts = new Array(20).fill("x".repeat(100000)); const s = parts.join("");'],
    ['concat', 'const s = "a".concat("b".repeat(999999), "c");'],
    ['replaceAll', 'const s = "a".repeat(100000).replaceAll("a", "aaaaaaaaaaaa");'],
    ['JSON.stringify', 'const s = JSON.stringify(new Array(50000).fill("abcdefghijklmnopqrstuvwxyz"));'],
  ])('stops %s with a clear limit error instead of crashing', (_, code) => {
    const r = script(code);
    expect(r.status).toBe('error');
    expect(r.error).toMatchObject({ kind: 'limit', name: 'RangeError', message: expect.stringMatching(tooLong) });
  });

  it('still builds ordinary strings', () => {
    const r = script('const a = "ab" + "cd"; const b = `${a}!`; const c = a.padStart(6, "-"); const d = ["x", "y"].join("+");');
    expect(r.status).toBe('finished');
    expect(r.plainGlobals).toEqual({ a: 'abcd', b: 'abcd!', c: '--abcd', d: 'x+y' });
  });
});

describe('steps share what did not change', () => {
  it('reuses one snapshot of an unchanged node across steps', () => {
    const r = runProgram({
      code: 'function reverse(head) { let prev = null, curr = head; while (curr) { const next = curr.next; curr.next = prev; prev = curr; curr = next; } return prev; }',
      mode: 'function',
      entry: 'reverse',
      inputs: [{ name: 'head', value: [1, 2, 3, 4, 5, 6, 7, 8], kind: 'list' }],
    });
    expect(r.status).toBe('finished');
    const all = r.steps.flatMap((s) => Object.values(s.heap));
    const unique = new Set(all);
    // Each node changes once (its next is flipped), so most per-step copies are the same object.
    expect(unique.size).toBeLessThan(all.length / 4);
  });

  it('gives a changed object a new snapshot every time it changes', () => {
    const r = script('const a = [1];\na.push(2);\na.push(3);');
    const seen = r.steps.flatMap((s) => {
      const a = Object.values(s.heap).find((h) => h.kind === 'array');
      return a && a.kind === 'array' ? [a.items.map((v) => (v.t === 'number' ? v.v : null))] : [];
    });
    expect(seen.map((x) => x.join(','))).toEqual(expect.arrayContaining(['1', '1,2', '1,2,3']));
  });

  it('shows "returns" only on the step that returns, not on earlier shared frames', () => {
    const r = script('function f(x) { const y = x + 1; return y; }\nconst z = f(1);');
    const withReturn = r.steps.filter((s) => s.frames.some((f) => f.returning));
    expect(withReturn.length).toBe(1);
    expect(withReturn[0].kind).toBe('return');
  });
});

describe('long strings in the trace', () => {
  it('keeps each step small while the answer uses the whole string', () => {
    const r = script('const big = "ab".repeat(400000); let k = 0; for (let i = 0; i < 600; i++) { k += 1; }');
    expect(r.status).toBe('finished');
    // 600+ steps that each see an 800,000-character string: without the cap this was over 500 MB.
    expect(JSON.stringify(r).length).toBeLessThan(10_000_000);
    const last = r.steps[r.steps.length - 1];
    const big = last.frames[0].vars.find((v) => v.name === 'big')!.value;
    expect(big).toMatchObject({ t: 'string', len: 800000 });
    expect(big.t === 'string' && big.v.length).toBe(200);
    expect((r.plainGlobals!.big as string).length).toBe(800000);
  });

  it('leaves short strings untouched', () => {
    const r = script('const s = "hello";');
    const v = r.steps[r.steps.length - 1].frames[0].vars.find((x) => x.name === 's')!.value;
    expect(v).toEqual({ t: 'string', v: 'hello' });
  });
});
