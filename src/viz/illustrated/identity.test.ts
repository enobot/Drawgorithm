// Item identities behind the illustrated queue: who is who must come from the trace,
// and an operation that reorders items without recording how starts over.
import { describe, expect, it } from 'vitest';
import { runProgram } from '../../engine/run';
import { refId } from '../analysis';
import { lastRead, trackArrayItems } from './identity';

function run(code: string) {
  const result = runProgram({ code, mode: 'script', inputs: [] });
  expect(result.status).toBe('finished');
  const last = result.steps[result.steps.length - 1];
  const line = last.frames[0].vars.find((v) => v.name === 'line')!;
  return { steps: result.steps, arrayId: refId(line.value)! };
}

describe('queue item identities', () => {
  it('keeps everyone their identity as the front is served and people join at the back', () => {
    const { steps, arrayId } = run(
      'const line = [];\nline.push(7);\nline.push(3);\nline.push(9);\nconst first = line.shift();\nline.push(5);\n',
    );
    const tracks = trackArrayItems(steps, arrayId).filter((t) => t !== null);
    const withThree = tracks.find((t) => t!.ids.length === 3)!.ids; // [7, 3, 9]
    const last = tracks[tracks.length - 1]!.ids; // [3, 9, 5]
    expect(last.slice(0, 2)).toEqual(withThree.slice(1));
    expect(withThree).not.toContain(last[2]);
  });

  it('records the step where each person joined', () => {
    const { steps, arrayId } = run('const line = [];\nline.push(7);\nline.push(3);\n');
    const final = trackArrayItems(steps, arrayId)[steps.length - 1]!;
    const [a, b] = final.ids.map((id) => final.joined.get(id)!);
    expect(steps[a].loc?.line).toBe(2);
    expect(steps[b].loc?.line).toBe(3);
  });

  it('reverses identities with reverse() and starts over after sort()', () => {
    const { steps, arrayId } = run('const line = [3, 1, 2];\nline.reverse();\nline.sort();\n');
    const tracks = trackArrayItems(steps, arrayId);
    const created = tracks.find((t) => t !== null)!.ids;
    const reversed = tracks.find((t) => t !== null && t.ids[0] === created[2])!.ids;
    expect(reversed).toEqual([...created].reverse());
    const sorted = tracks[tracks.length - 1]!.ids;
    expect(sorted.some((id) => created.includes(id))).toBe(false);
  });
});

describe('last slot read', () => {
  it('finds the most recent read of an array at or before a step', () => {
    const code = 'const line = [4, 8, 15];\nlet a = line[2];\nlet b = 0;\nlet c = line[0];\n';
    const { steps, arrayId } = run(code);
    const afterFirstRead = steps.findIndex((s) => s.effects.some((e) => e.type === 'index-read'));
    expect(lastRead(steps, arrayId, afterFirstRead - 1)).toBeNull();
    expect(lastRead(steps, arrayId, afterFirstRead)).toEqual({ step: afterFirstRead, index: 2 });
    expect(lastRead(steps, arrayId, afterFirstRead + 1)?.index).toBe(2);
    expect(lastRead(steps, arrayId, steps.length - 1)?.index).toBe(0);
  });
});
