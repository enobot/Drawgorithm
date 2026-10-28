import { useEffect, useRef } from 'react';
import { monaco } from '../editor/monaco';
import type { SourceLoc } from '../trace/types';

export interface EditorMarks {
  /** Location of the current playback step. */
  current: SourceLoc | null;
  /** Line of the step before, shown faintly. */
  previousLine: number | null;
  /** Lines linked to the selected node or structure. */
  related: number[];
  /** Line still being typed (Live Build is waiting for it). */
  pendingLine: number | null;
  error: { loc: SourceLoc; message: string } | null;
}

interface Props {
  value: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onCursorLine: (line: number) => void;
  /** Ctrl+S: the code is saved automatically, so this only formats when format on save is on. */
  onSave: () => void;
  marks: EditorMarks;
  /** Bumped to scroll a line into view (e.g. after selecting a node). */
  reveal: { line: number; nonce: number } | null;
  /** Bumped to run Format Document. */
  formatNonce: number;
  /** Syntax colors for the code's language. */
  language: 'javascript' | 'python';
}

// The text model outlives the editor widget, so switching layouts (rotating a tablet,
// resizing past a breakpoint) keeps the undo history, cursor and scroll position.
let sharedModel: monaco.editor.ITextModel | null = null;
let savedViewState: monaco.editor.ICodeEditorViewState | null = null;

function modelFor(value: string): monaco.editor.ITextModel {
  if (!sharedModel || sharedModel.isDisposed()) sharedModel = monaco.editor.createModel(value, 'javascript');
  return sharedModel;
}

export function CodeEditor({ value, onChange, onRun, onCursorLine, onSave, marks, reveal, formatNonce, language }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const callbacks = useRef({ onChange, onRun, onCursorLine, onSave });
  // A remounted editor must not repeat a format that was requested before it existed.
  const handledFormat = useRef(formatNonce);
  useEffect(() => {
    callbacks.current = { onChange, onRun, onCursorLine, onSave };
  });

  useEffect(() => {
    if (!host.current) return;
    const model = modelFor(value);
    const editor = monaco.editor.create(host.current, {
      model,
      theme: 'drawgorithms',
      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
      fontSize: 14,
      lineHeight: 22,
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      glyphMargin: true,
      lineNumbersMinChars: 3,
      renderLineHighlight: 'none',
      tabSize: 2,
      padding: { top: 12, bottom: 12 },
      ariaLabel: 'Code editor. Press Control+Enter to run.',
      wordBasedSuggestions: 'currentDocument',
      fixedOverflowWidgets: true,
      // Monaco's EditContext input is marked experimental; the textarea input is the stable path.
      editContext: false,
      overviewRulerLanes: 0,
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    });
    editorRef.current = editor;
    if (savedViewState) editor.restoreViewState(savedViewState);
    decorations.current = editor.createDecorationsCollection();
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => callbacks.current.onRun());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => callbacks.current.onSave());
    const sub1 = editor.onDidChangeModelContent(() => callbacks.current.onChange(editor.getValue()));
    const sub2 = editor.onDidChangeCursorPosition((e) => callbacks.current.onCursorLine(e.position.lineNumber));
    return () => {
      sub1.dispose();
      sub2.dispose();
      savedViewState = editor.saveViewState();
      // Decorations belong to this widget; the shared model keeps only the text and its history.
      decorations.current?.clear();
      editor.dispose();
      editorRef.current = null;
    };
    // The editor is created once; later value changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (model && model.getLanguageId() !== language) monaco.editor.setModelLanguage(model, language);
  }, [language]);

  // External changes (Reset, Load example) replace the text but stay undoable.
  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model || model.getValue() === value) return;
    editor.pushUndoStop();
    editor.executeEdits('drawgorithms', [{ range: model.getFullModelRange(), text: value }]);
    editor.pushUndoStop();
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model || !decorations.current) return;
    const lines = model.getLineCount();
    const valid = (n: number | null | undefined): n is number => !!n && n >= 1 && n <= lines;
    const list: monaco.editor.IModelDeltaDecoration[] = [];
    const whole = (line: number, className: string, extra: Partial<monaco.editor.IModelDecorationOptions> = {}) =>
      list.push({ range: new monaco.Range(line, 1, line, 1), options: { isWholeLine: true, className, ...extra } });

    if (valid(marks.previousLine) && marks.previousLine !== marks.current?.line) whole(marks.previousLine, 'dg-line-previous');
    for (const l of marks.related) if (valid(l)) whole(l, 'dg-line-related');
    if (valid(marks.pendingLine))
      whole(marks.pendingLine, 'dg-line-pending', { hoverMessage: { value: 'Waiting for this line to finish' } });
    if (marks.error && valid(marks.error.loc.line)) whole(marks.error.loc.line, 'dg-line-error');
    const cur = marks.current;
    if (cur && valid(cur.line)) {
      whole(cur.line, 'dg-line-current', { glyphMarginClassName: 'dg-glyph-current' });
      if (cur.line === cur.endLine && cur.endColumn > cur.column) {
        list.push({
          range: new monaco.Range(cur.line, cur.column + 1, cur.endLine, cur.endColumn + 1),
          options: { inlineClassName: 'dg-range-current' },
        });
      }
      editor.revealLineInCenterIfOutsideViewport(cur.line);
    }
    decorations.current.set(list);

    const markers: monaco.editor.IMarkerData[] = [];
    if (marks.error && valid(marks.error.loc.line)) {
      const e = marks.error.loc;
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        message: marks.error.message,
        startLineNumber: e.line,
        startColumn: e.column + 1,
        endLineNumber: e.endLine,
        endColumn: Math.max(e.endColumn + 1, e.column + 2),
      });
    }
    monaco.editor.setModelMarkers(model, 'drawgorithms', markers);
  }, [marks, value]);

  useEffect(() => {
    if (reveal && editorRef.current) editorRef.current.revealLineInCenterIfOutsideViewport(reveal.line);
  }, [reveal]);

  useEffect(() => {
    if (formatNonce === handledFormat.current) return;
    handledFormat.current = formatNonce;
    void editorRef.current?.getAction('editor.action.formatDocument')?.run();
  }, [formatNonce]);

  return <div ref={host} className="h-full w-full" />;
}
