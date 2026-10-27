// Keep the verified tutorial separate from imported community experiments.
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
