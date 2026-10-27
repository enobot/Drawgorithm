// Languages shown in the editor. Only languages with a working adapter (validation,
// execution with step tracing, and drawing) are selectable; the rest say why not.
export type LanguageId = 'javascript' | 'typescript' | 'python' | 'java' | 'cpp';

export interface LanguageInfo {
  id: LanguageId;
  label: string;
  available: boolean;
  /** Why it is not available yet (shown in the picker). */
  note: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { id: 'javascript', label: 'JavaScript', available: true, note: 'Interpreted in a sandboxed worker with step tracing.' },
  {
    id: 'typescript',
    label: 'TypeScript',
    available: false,
    note: 'Not available yet: needs a type-erasing adapter that keeps line positions.',
  },
  { id: 'python', label: 'Python', available: false, note: 'Not available yet: planned adapter runs real CPython (Pyodide) in a worker.' },
  { id: 'java', label: 'Java', available: false, note: 'Not available yet: needs a server-side sandbox to compile and trace.' },
  { id: 'cpp', label: 'C++', available: false, note: 'Not available yet: needs a server-side sandbox to compile and trace.' },
];
