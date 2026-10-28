// Starter code per language. JavaScript starters are written with each problem; for Python,
// a stub is made from the problem's entry function and inputs, so every problem can be
// solved in either language.
import type { LanguageId } from '../languages';
import type { ProblemDef } from './catalog';

// Python's reserved words (keyword.kwlist).
const PYTHON_KEYWORDS = new Set(
  `False None True and as assert async await break class continue def del elif else except finally for from global
   if import in is lambda nonlocal not or pass raise return try while with yield`.split(/\s+/),
);

/** A parameter name for an input: a Python reserved word gets a trailing underscore (from → from_), which Run matches back. */
export const pythonParam = (name: string) => (PYTHON_KEYWORDS.has(name) ? `${name}_` : name);

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
    `def ${p.entry ?? 'solve'}(${params.map((x) => pythonParam(x.name)).join(', ')}):`,
    ...notes.map((n) => `    ${n}`),
    '    # Write your solution here.',
    '    pass',
    '',
  ].join('\n');
}

export function starterIn(p: ProblemDef, language: LanguageId): string {
  return language === 'python' ? (p.python?.starter ?? pythonStarter(p)) : p.starter;
}

/**
 * The description and the notes on how the starter code works and what to try, for the code
 * `language` starts from. A generated Python stub has no notes: the JavaScript ones describe
 * code it doesn't have.
 */
export function notesIn(p: ProblemDef, language: LanguageId): { description: string[]; explanation: string; tryThis: string[] } {
  if (language !== 'python') return { description: p.description, explanation: p.explanation, tryThis: p.tryThis };
  if (!p.python) return { description: p.description, explanation: '', tryThis: [] };
  return {
    description: p.python.description ?? p.description,
    explanation: p.python.explanation ?? p.explanation,
    tryThis: p.python.tryThis ?? p.tryThis,
  };
}
