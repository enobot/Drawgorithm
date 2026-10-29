// The guide's title, its introduction and the ten section titles. These are the same for every
// exercise; everything specific to a problem lives in its guide (guides.ts).
import type { SectionId } from './schema';

export const GUIDE_TITLE = 'How to Explain This in an Interview';

export const GUIDE_INTRO =
  'Knowing how to solve a problem and explaining it while you solve it are different skills. This guide shows what you could say, in what order, and why each part helps. Adapt the wording to your own voice; it isn’t a script.';

export const SECTIONS: { id: SectionId; title: string }[] = [
  { id: 'understand', title: 'Understanding the problem' },
  { id: 'clarify', title: 'Clarifying requirements' },
  { id: 'example', title: 'Walking through an example' },
  { id: 'baseline', title: 'Describing a baseline' },
  { id: 'improve', title: 'Finding an improvement' },
  { id: 'approach', title: 'Explaining the chosen approach' },
  { id: 'narrate', title: 'Narrating key code decisions' },
  { id: 'test', title: 'Testing the solution' },
  { id: 'complexity', title: 'Explaining complexity' },
  { id: 'wrapUp', title: 'Wrapping up' },
];
