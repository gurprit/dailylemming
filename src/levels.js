// Original proof-of-concept levels, not copied from Lemmings or Lix.
// Lix CC0 puzzle import comes later, after format compatibility is established.
export const LEVELS = [
  {
    id: 'bridge-at-dusk', title: 'Bridge at Dusk', subtitle: 'Mind the gap. A builder can make a path.',
    difficulty: 'Easy', spawn: { x: 68, y: 200 }, exit: { x: 820, y: 276 },
    total: 8, required: 6, limit: 150,
    skills: { builder: 4, basher: 0, digger: 0, blocker: 1 },
    terrain: [{ x: 0, y: 298, w: 246, h: 62 }, { x: 330, y: 298, w: 550, h: 62 }]
  },
  {
    id: 'through-the-hill', title: 'Through the Hill', subtitle: 'A basher can tunnel through a stone wall.',
    difficulty: 'Easy', spawn: { x: 65, y: 200 }, exit: { x: 820, y: 276 },
    total: 8, required: 6, limit: 150,
    skills: { builder: 0, basher: 3, digger: 0, blocker: 1 },
    terrain: [{ x: 0, y: 298, w: 880, h: 62 }, { x: 350, y: 216, w: 76, h: 82 }]
  },
  {
    id: 'two-ridges', title: 'The Two Ridges', subtitle: 'One bridge may not be enough.',
    difficulty: 'Tricky', spawn: { x: 65, y: 200 }, exit: { x: 820, y: 276 },
    total: 9, required: 6, limit: 180,
    skills: { builder: 6, basher: 0, digger: 0, blocker: 1 },
    terrain: [
      { x: 0, y: 298, w: 220, h: 62 },
      { x: 305, y: 298, w: 250, h: 62 },
      { x: 635, y: 298, w: 245, h: 62 }
    ]
  },
  {
    id: 'rock-and-rift', title: 'Rock & Rift', subtitle: 'Dig a tunnel, then build a bridge.',
    difficulty: 'Tricky', spawn: { x: 65, y: 200 }, exit: { x: 820, y: 276 },
    total: 9, required: 6, limit: 180,
    skills: { builder: 5, basher: 3, digger: 1, blocker: 1 },
    terrain: [
      { x: 0, y: 298, w: 360, h: 62 },
      { x: 442, y: 298, w: 438, h: 62 },
      { x: 225, y: 227, w: 60, h: 71 }
    ]
  }
];
