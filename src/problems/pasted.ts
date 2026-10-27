// Reads pasted problem text (LeetCode-style) to pre-fill inputs and expected output.
// It does not generate any animation: Run still executes the code the user writes.
import type { InputKind } from '../trace/types';

export interface ParsedValue {
  raw: string;
  value: unknown;
  ok: boolean;
}

export interface ParsedExample {
  inputs: { name: string; parsed: ParsedValue }[];
  output: ParsedValue | null;
  explanation: string;
}

export interface ParsedProblem {
  title: string;
  description: string;
  examples: ParsedExample[];
  functionName: string;
  kinds: Record<string, InputKind>;
}

/** Parses a JSON-like value, accepting the Python-style spellings some sites use. */
export function parseValue(raw: string): ParsedValue {
  const text = raw.trim().replace(/,\s*$/, '');
  if (!text) return { raw, value: undefined, ok: false };
  const attempts = [
    text,
    text.replace(/'/g, '"'),
    text
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null'),
  ];
  for (const a of attempts) {
    try {
      return { raw: text, value: JSON.parse(a), ok: true };
    } catch {
      // try the next spelling
    }
  }
  return { raw: text, value: text, ok: false };
}

/** Splits `nums = [2,7,11,15], target = 9` into named values, respecting brackets and quotes. */
export function splitAssignments(text: string): { name: string; raw: string }[] {
  const starts: { name: string; valueStart: number; nameStart: number }[] = [];
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '[' || ch === '{' || ch === '(') depth++;
    else if (ch === ']' || ch === '}' || ch === ')') depth--;
    else if (depth === 0 && /[A-Za-z_$]/.test(ch) && (i === 0 || /[\s,]/.test(text[i - 1]))) {
      const m = /^([A-Za-z_$][\w$]*)\s*=(?!=)/.exec(text.slice(i));
      if (m) {
        starts.push({ name: m[1], nameStart: i, valueStart: i + m[0].length });
        i += m[0].length - 1;
      }
    }
  }
  if (!starts.length) return text.trim() ? [{ name: 'input', raw: text.trim() }] : [];
  return starts.map((s, k) => {
    const end = k + 1 < starts.length ? starts[k + 1].nameStart : text.length;
    return { name: s.name, raw: text.slice(s.valueStart, end).trim().replace(/,$/, '').trim() };
  });
}

function camelCase(title: string): string {
  const words = title
    .replace(/^\s*\d+\.\s*/, '')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return 'solve';
  const name = words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join('');
  return /^[A-Za-z_$]/.test(name) ? name : 'solve';
}

const LIST_NAMES = /^(head|l1|l2|list\d*|head[AB]?)$/i;
const TREE_NAMES = /^(root\d*|p|q|subRoot|tree\d*)$/i;

export function parseProblemText(text: string): ParsedProblem {
  const normalized = text.replace(/\r\n?/g, '\n');
  const firstExample = normalized.search(/^\s*Example\s*\d*\s*:?/im);
  const head = (firstExample >= 0 ? normalized.slice(0, firstExample) : normalized).trim();
  const headLines = head
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  let title = '';
  if (headLines.length && headLines[0].length <= 80 && !/[.?]$/.test(headLines[0])) title = headLines.shift()!;
  // Drop difficulty labels and similar one-word lines that pasted pages often include.
  const description = headLines.filter((l) => !/^(easy|medium|hard|topics|companies|hint)$/i.test(l)).join('\n');

  const examples: ParsedExample[] = [];
  const blocks = normalized.split(/^\s*Example\s*\d*\s*:?/im).slice(1);
  for (const block of blocks) {
    const body = block.split(/^\s*(Constraints|Follow[- ]up|Note)\s*:/im)[0];
    const inputMatch = /Input\s*:\s*([\s\S]*?)(?=\n\s*Output\s*:|$)/i.exec(body);
    const outputMatch = /Output\s*:\s*([\s\S]*?)(?=\n\s*Explanation\s*:|\n\s*\n|$)/i.exec(body);
    const explanationMatch = /Explanation\s*:\s*([\s\S]*)$/i.exec(body);
    if (!inputMatch) continue;
    const inputs = splitAssignments(inputMatch[1].replace(/\s*\n\s*/g, ' ')).map((a) => ({ name: a.name, parsed: parseValue(a.raw) }));
    examples.push({
      inputs,
      output: outputMatch ? parseValue(outputMatch[1].trim()) : null,
      explanation: explanationMatch ? explanationMatch[1].trim().replace(/\s+/g, ' ') : '',
    });
  }

  const lower = normalized.toLowerCase();
  const kinds: Record<string, InputKind> = {};
  for (const input of examples[0]?.inputs ?? []) {
    const isArray = Array.isArray(input.parsed.value);
    if (isArray && lower.includes('linked list') && LIST_NAMES.test(input.name)) kinds[input.name] = 'list';
    else if (isArray && /binary (search )?tree|\bbst\b/.test(lower) && TREE_NAMES.test(input.name)) kinds[input.name] = 'tree';
    else kinds[input.name] = 'auto';
  }

  return { title: title.replace(/^\s*\d+\.\s*/, ''), description, examples, functionName: camelCase(title), kinds };
}

export interface StructureSuggestion {
  structure: string;
  /** The words in the description that led to the suggestion. */
  because: string;
}

// Patterns are tried in order, most specific first, so the quoted evidence is the clearest one.
const SUGGESTION_RULES: { structure: string; patterns: RegExp[] }[] = [
  { structure: 'Linked list', patterns: [/linked list/i] },
  { structure: 'Binary tree', patterns: [/binary (search )?tree/i, /\bBST\b/, /\broot\b/i] },
  { structure: 'Graph', patterns: [/\bgraph\b/i, /adjacen\w*/i, /prerequisites?/i, /\bedges?\b/i] },
  { structure: 'Grid / matrix', patterns: [/\bgrid\b/i, /\bmatrix\b/i, /m x n/i] },
  { structure: 'Hash map / set', patterns: [/\bfrequenc\w*/i, /\banagrams?\b/i, /\bduplicates?\b/i, /\bdistinct\b/i, /\bunique\b/i] },
  { structure: 'Stack', patterns: [/\bstack\b/i, /parenthes\w*/i, /brackets?/i, /next greater/i] },
  { structure: 'Queue', patterns: [/\bqueue\b/i, /level order/i, /breadth/i] },
  { structure: 'Heap', patterns: [/\bheap\b/i, /k(th|-th)? (largest|smallest)/i, /\btop k\b/i, /priority/i] },
  { structure: 'Sliding window / two pointers', patterns: [/\bwindow\b/i, /substring/i, /subarray/i, /\bconsecutive\b/i] },
  { structure: 'Sorted array / binary search', patterns: [/O\(log ?n\)/i, /\bsorted\b/i, /\bascending\b/i] },
  {
    structure: 'Dynamic programming table',
    patterns: [/number of ways/i, /longest common/i, /minimum (number|cost)/i, /maximum (profit|sum)/i, /\bclimb\w*/i],
  },
  { structure: 'Intervals', patterns: [/\bintervals?\b/i, /\bmeetings?\b/i, /overlap\w*/i] },
  { structure: 'Bits', patterns: [/binary representation/i, /\bxor\b/i, /\bbits?\b/i] },
];

/**
 * Data structures the description mentions or hints at. These are suggestions for
 * choosing inputs and drawings; they say nothing about what the user's code does.
 */
export function suggestStructures(text: string): StructureSuggestion[] {
  const out: StructureSuggestion[] = [];
  for (const rule of SUGGESTION_RULES) {
    for (const pattern of rule.patterns) {
      const m = pattern.exec(text);
      if (m) {
        out.push({ structure: rule.structure, because: m[0] });
        break;
      }
    }
  }
  return out;
}

export function starterFor(problem: ParsedProblem): string {
  const params = problem.examples[0]?.inputs.map((i) => i.name) ?? [];
  return `function ${problem.functionName}(${params.join(', ')}) {\n  // Write your solution here.\n\n}\n`;
}
