// Starter code per language. JavaScript starters are written with each problem; for Python,
// a stub is made from the problem's entry function and inputs, so every problem can be
// solved in either language.
import type { LanguageId } from '../languages';
import type { ProblemDef } from './catalog';

export function pythonStarter(p: ProblemDef): string {
  if (p.mode === 'script') return `# ${p.title}\n# Write Python here: Run runs it from the top.\n`;
  const params = p.params.filter((x) => x.kind !== 'pos');
  const notes = params.flatMap((x) =>
    x.kind === 'tree'
      ? [`# ${x.name} is a TreeNode (val, left, right), or None for an empty tree.`]
      : x.kind === 'list'
        ? [`# ${x.name} is a ListNode (val, next), or None for an empty list.`]
        : [],
  );
  return [
    `def ${p.entry ?? 'solve'}(${params.map((x) => x.name).join(', ')}):`,
    ...notes.map((n) => `    ${n}`),
    '    # Write your solution here.',
    '    pass',
    '',
  ].join('\n');
}

export function starterIn(p: ProblemDef, language: LanguageId): string {
  return language === 'python' ? pythonStarter(p) : p.starter;
}
