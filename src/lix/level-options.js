// Keep two verified practice puzzles separate from imported community experiments.
// Imported original levels require more original-Lix skills than our current
// browser adapter implements; don't silently claim they are solvable.
export const LEVEL_OPTIONS = Object.freeze({
  'little-bridge': {
    name: 'Little Bridge', category: 'tutorial', verified: true,
    intro: 'One gap and one builder. A friendly introduction to the real Lix artwork.',
    credit: 'Original Daily Lemming tutorial using CC0 Lix artwork.',
    source: 'https://github.com/gurprit/dailylemming/blob/feat/lix-physics-polish/content/original/little-bridge.txt',
    hint: 'Press Start, then tap the Lix near BUILD HERE. Just one staircase needed.'
  },
  'double-trouble': {
    name: 'Double Trouble', category: 'intermediate', verified: true,
    intro: 'Two little gaps and two builder assignments. Just the right step up after Little Bridge.',
    credit: 'Original Daily Lemming intermediate level using CC0 Lix artwork.',
    source: 'https://github.com/gurprit/dailylemming/blob/feat/lix-sprite-water-levels/content/original/double-trouble.txt',
    hint: 'Two gaps! Build near the first marker, then assign another builder near the second.'
  },
  'tunnel-time': {
    name: 'Tunnel Time', category: 'intermediate', verified: true,
    intro: 'Meet the Basher! One sandstone wall stands between your Lix and freedom. Tunnel through it.',
    credit: 'Original Daily Lemming Basher tutorial using CC0 Lix artwork.',
    source: 'https://github.com/gurprit/dailylemming/blob/feat/lix-skills-and-exit/content/original/tunnel-time.txt',
    hint: 'Select Basher (⛏️), then tap the Lix just before the BASH HERE marker at the wall.'
  },
  'dig-for-freedom': {
    name: 'Dig for Freedom', category: 'intermediate', verified: true,
    intro: 'The exit is below! Use a Digger to cut through the upper sandstone floor, drop safely and reach freedom.',
    credit: 'Original Daily Lemming Digger training puzzle, using CC0 Lix art.',
    source: 'https://github.com/gurprit/dailylemming/blob/feat/lix-skills-and-exit/content/original/dig-for-freedom.txt',
    hint: 'Select Digger (🕳️), then tap your Lix near DIG HERE on the upper platform.'
  },
  pitfall: {
    name: 'Pitfall', category: 'community', verified: false,
    intro: 'An original Lix puzzle by Insane Steve. Real map and terrain, but many original skills are not implemented yet.',
    credit: 'Pitfall by Insane Steve, from the CC0 Lix Lovely pack.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/single/lemforum/Lovely/pitfall.txt',
    hint: 'Community experiment: building works, but climbing, digging and other original skills are not yet implemented. Not certified solvable.'
  },
  'building-block-maze': {
    name: 'Building Block Maze', category: 'community', verified: false,
    intro: 'Explore Insane Steve’s two-exit maze. The original map is real; platforming and terrain-removal skills still need implementing.',
    credit: 'Building Block Maze by Insane Steve, from the CC0 Lix Lovely pack.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/single/lemforum/Lovely/buildingblock.txt',
    hint: 'Community experiment: builder works, but platformer, digger, basher and miner are not yet implemented. Not certified solvable.'
  },
  '6gaps': {
    name: '6 Gaps, 5 Builders', category: 'community', verified: false,
    intro: 'The difficult original CC0 Lix level by mobius. Physics parity and a winning route are still unverified.',
    credit: '6 Gaps, 5 Builders by mobius, from the CC0 Lix Lovely pack.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/single/lemforum/Lovely/6gaps.txt',
    hint: 'Five builders, six gaps. This original Lix level is an experimental compatibility challenge.'
  }
});
export function resolveLevelId(raw) {
  return Object.hasOwn(LEVEL_OPTIONS, raw) ? raw : 'little-bridge';
}
