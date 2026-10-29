// Monaco is bundled locally (no CDN). The JavaScript language service is
// switched off: syntax errors come from the same parser the engine uses,
// so the editor and the drawing never disagree about what is valid.
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import { formatJavaScript, type FormatResult } from './format';

self.MonacoEnvironment = {
  getWorker: (_id, label) => (label === 'typescript' || label === 'javascript' ? new TsWorker() : new EditorWorker()),
};

// The JavaScript language service provides autocomplete, hovers and parameter hints only.
// Errors come from the engine's own parser, so the editor and the drawing agree on what is valid.
monaco.typescript.javascriptDefaults.setModeConfiguration({
  completionItems: true,
  hovers: true,
  signatureHelp: true,
  documentSymbols: false,
  definitions: false,
  references: false,
  documentHighlights: true,
  rename: false,
  diagnostics: false,
  documentRangeFormattingEdits: false,
  onTypeFormattingEdits: false,
  codeActions: false,
  inlayHints: false,
});
// No DOM: user code cannot reach the page, so the editor shouldn't suggest it.
monaco.typescript.javascriptDefaults.setCompilerOptions({ allowJs: true, allowNonTsExtensions: true, lib: ['es2023'], target: 99 });
monaco.typescript.javascriptDefaults.addExtraLib(
  `/** Binary tree node, LeetCode style. */
declare class TreeNode { constructor(val?: number, left?: TreeNode | null, right?: TreeNode | null); val: number; left: TreeNode | null; right: TreeNode | null; }
/** Singly linked list node, LeetCode style. */
declare class ListNode { constructor(val?: number, next?: ListNode | null); val: number; next: ListNode | null; }`,
  'ts:drawgorithms-globals.d.ts',
);

monaco.editor.defineTheme('drawgorithms', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Light enough for 4.5:1 contrast on the current-step line highlight as well as the editor background.
    { token: 'comment', foreground: 'a6b5d2', fontStyle: 'italic' },
    { token: 'keyword', foreground: 'c4b5fd' },
    { token: 'number', foreground: 'fcd34d' },
    { token: 'string', foreground: '99f6e4' },
    { token: 'identifier', foreground: 'e6ecf7' },
    { token: 'type.identifier', foreground: '7dd3fc' },
    { token: 'delimiter', foreground: 'b8c4dc' },
  ],
  colors: {
    'editor.background': '#0f1a2e',
    'editor.foreground': '#e6ecf7',
    'editorLineNumber.foreground': '#7d91b5',
    'editorLineNumber.activeForeground': '#a6b5d2',
    'editor.selectionBackground': '#2d467099',
    'editor.inactiveSelectionBackground': '#2d467055',
    'editorCursor.foreground': '#5eead4',
    'editorIndentGuide.background1': '#1c2d4b',
    'editorIndentGuide.activeBackground1': '#2d4670',
    'editorGutter.background': '#0f1a2e',
    'editorWidget.background': '#13213a',
    'editorWidget.border': '#2d4670',
    'scrollbarSlider.background': '#2d467066',
    'scrollbarSlider.hoverBackground': '#3f5b8a88',
    'editorError.foreground': '#fb7185',
    'editorBracketMatch.background': '#2d467066',
    'editorBracketMatch.border': '#3f5b8a',
  },
});

// Format Document (Shift+Alt+F, the context menu, and the Format Code button) uses Prettier.
// Monaco applies the result as minimal edits, so the cursor stays put and Ctrl+Z undoes it.
type FormatListener = (r: FormatResult) => void;
let formatListener: FormatListener = () => {};
export function setFormatListener(fn: FormatListener): void {
  formatListener = fn;
}

monaco.languages.registerDocumentFormattingEditProvider('javascript', {
  displayName: 'Prettier',
  async provideDocumentFormattingEdits(model) {
    const result = await formatJavaScript(model.getValue());
    formatListener(result);
    if (!result.ok || !result.changed) return [];
    return [{ range: model.getFullModelRange(), text: result.code }];
  },
});

export { monaco };
