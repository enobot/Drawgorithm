import { describe, expect, it } from 'vitest';
import { PROBLEMS } from '../problems/catalog';
import { formatJavaScript } from './format';

describe('formatting user code', () => {
  it('formats messy code without changing what it does', async () => {
    const messy =
      'function twoSum(nums,target){const seen=new Map();for(let i=0;i<nums.length;i++){const c=target-nums[i];if(seen.has(c))return [seen.get(c),i];seen.set(nums[i],i)}return []}';
    const r = await formatJavaScript(messy);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.changed).toBe(true);
    expect(r.code).toContain('function twoSum(nums, target) {\n  const seen = new Map();');
    // Same variable names, same algorithm.
    expect(r.code).toContain('seen.set(nums[i], i);');
    expect(r.code).toContain('const c = target - nums[i];');
  });

  it('is stable when applied repeatedly', async () => {
    const first = await formatJavaScript('let a=2;let b=5;let sum=a+b');
    if (!first.ok) throw new Error(first.message);
    const second = await formatJavaScript(first.code);
    if (!second.ok) throw new Error(second.message);
    expect(second.code).toBe(first.code);
    expect(second.changed).toBe(false);
  });

  it('leaves incomplete code unchanged and says which line', async () => {
    const r = await formatJavaScript('const root = new TreeNode(5);\nroot.left = new TreeNode(\n');
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain('left unchanged');
    expect(r.line).toBe(3);
  });

  it('keeps the cursor on the same piece of code', async () => {
    const code = 'let  a=2;\nlet b  =  5;';
    const offset = code.indexOf('5');
    const r = await formatJavaScript(code, offset);
    if (!r.ok) throw new Error(r.message);
    expect(r.code[r.cursorOffset]).toBe('5');
  });

  it('keeps comments', async () => {
    const r = await formatJavaScript('// value -> index\nconst seen=new Map()');
    if (!r.ok) throw new Error(r.message);
    expect(r.code).toBe('// value -> index\nconst seen = new Map();\n');
  });

  it('leaves every built-in starter unchanged (starters already follow the style)', async () => {
    for (const p of PROBLEMS) {
      const r = await formatJavaScript(p.starter);
      if (!r.ok) throw new Error(`${p.id}: ${r.message}`);
      expect({ id: p.id, code: r.code }).toEqual({ id: p.id, code: p.starter });
    }
  });
});
