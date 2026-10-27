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
}

export function CodeEditor({ value, onChange, onRun, onCursorLine, onSave, marks, reveal, formatNonce }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const decorations = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
  const callbacks = useRef({ onChange, onRun, onCursorLine, onSave });
  useEffect(() => {
    callbacks.current = { onChange, onRun, onCursorLine, onSave };
  });

  useEffect(() => {
    if (!host.current) return;
    const editor = monaco.editor.create(host.current, {
      value,
      language: 'javascript',
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
      ariaLabel: 'JavaScript code editor. Press Control+Enter to run.',
      wordBasedSuggestions: 'currentDocument',
      fixedOverflowWidgets: true,
      // Monaco's EditContext input is marked experimental; the textarea input is the stable path.
      editContext: false,
      overviewRulerLanes: 0,
      scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    });
    editorRef.current = editor;
    decorations.current = editor.createDecorationsCollection();
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => callbacks.current.onRun());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => callbacks.current.onSave());
    const sub1 = editor.onDidChangeModelContent(() => callbacks.current.onChange(editor.getValue()));
    const sub2 = editor.onDidChangeCursorPosition((e) => callbacks.current.onCursorLine(e.position.lineNumber));
    return () => {
      sub1.dispose();
      sub2.dispose();
      editor.getModel()?.dispose();
      editor.dispose();
      editorRef.current = null;
    };
    // The editor is created once; later value changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (formatNonce > 0) void editorRef.current?.getAction('editor.action.formatDocument')?.run();
  }, [formatNonce]);

  return <div ref={host} className="h-full w-full" />;
}
