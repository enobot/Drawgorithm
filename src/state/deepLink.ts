// Links such as ?example=two-sum&view=visual open a working demo directly, so a
// visitor arriving from a shared link sees a drawing first. Only catalog examples
// are accepted; anything else in the query is ignored.

export type Pane = 'problem' | 'code' | 'visual';

export interface DeepLink {
  problemId?: string;
  pane?: Pane;
}

const PANES: readonly string[] = ['problem', 'code', 'visual'] satisfies Pane[];

export function readDeepLink(search: string, isExample: (id: string) => boolean): DeepLink {
  const params = new URLSearchParams(search);
  const id = params.get('example');
  const view = params.get('view');
  const link: DeepLink = {};
  if (id && isExample(id)) link.problemId = id;
  if (view && PANES.includes(view)) link.pane = view as Pane;
  return link;
}

/** The same address without the demo parameters, so a reload keeps the visitor's own choices. */
export function withoutDeepLink(search: string): string {
  const params = new URLSearchParams(search);
  params.delete('example');
  params.delete('view');
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
