// Keep two verified practice puzzles separate from imported community experiments.
// Imported original levels require more original-Lix skills than our current
// browser adapter implements; don't silently claim they are solvable.
export const LEVEL_OPTIONS = Object.freeze({
  'lix-builders': {
    name: 'Builders', category: 'official-tutorial', verified: false,
    intro: 'Bridge over obstacles using the original Lix Builders training map. This authentic tutorial is in browser-compatibility testing.',
    credit: 'Original Lix tutorial by Simon, distributed under CC0.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/tutorial/basic/builders.txt',
    hint: 'Official Lix tutorial: choose Builder, then tap a grounded Lix. Not yet certified solvable with our adapted browser physics.',
    tutorialFile: 'builders'
  },
  'lix-bashers': {
    name: 'Bashers', category: 'official-tutorial', verified: false,
    intro: 'Tunnel through sandstone using the original Lix Bashers training map. This authentic tutorial is in browser-compatibility testing.',
    credit: 'Original Lix tutorial by Simon, distributed under CC0.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/tutorial/basic/bashers.txt',
    hint: 'Official Lix tutorial: choose Basher, then tap a grounded Lix. Not yet certified solvable with our adapted browser physics.',
    tutorialFile: 'bashers'
  },
  'lix-diggers': {
    name: 'Diggers', category: 'official-tutorial', verified: false,
    intro: 'Dig through the floor in the original Lix Diggers training map. This authentic tutorial is in browser-compatibility testing.',
    credit: 'Original Lix tutorial by Simon, distributed under CC0.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/tutorial/basic/diggers.txt',
    hint: 'Official Lix tutorial: choose Digger, then tap a grounded Lix. Not yet certified solvable with our adapted browser physics.',
    tutorialFile: 'diggers'
  },
  'lix-miners': {
    name: 'Miners', category: 'official-tutorial', verified: false,
    intro: 'Mine sloping tunnels in the original Lix Miners training map. This authentic tutorial is in browser-compatibility testing.',
    credit: 'Original Lix tutorial by Simon/Wuzzy, distributed under CC0.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/tutorial/basic/miners.txt',
    hint: 'Official Lix tutorial: choose Miner, then tap a grounded Lix. Not yet certified solvable with our adapted browser physics.',
    tutorialFile: 'miners'
  },
  'lix-blockers': {
    name: 'Blockers', category: 'official-tutorial', verified: false,
    intro: 'Redirect crowds with the original Lix Blockers training map. This authentic tutorial is in browser-compatibility testing.',
    credit: 'Original Lix tutorial by Simon, distributed under CC0.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/tutorial/basic/blockers.txt',
    hint: 'Official Lix tutorial: choose Blocker, then tap a grounded Lix. Not yet certified solvable with our adapted browser physics.',
    tutorialFile: 'blockers'
  },

  'lix-platformers': {
    name: 'Platformers', category: 'official-tutorial', verified: false,
    intro: 'Original Lix Platformers tutorial. Assign platformer skills; browser physics remain an approximate adaptation.',
    credit: 'Original Lix level by Wuzzy/Simon, CC0 public-domain dedication.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/tutorial/basic/platformers.txt',
    hint: 'Use platformer to guide your Lix toward the exit. Not yet solution-verified by our browser engine.',
    tutorialFile: 'platformers'
  },
  'lix-jumpers': {
    name: 'Jumpers', category: 'official-tutorial', verified: false,
    intro: 'Original Lix Jumpers tutorial. Assign jumper skills; browser physics remain an approximate adaptation.',
    credit: 'Original Lix level by geoo, CC0 public-domain dedication.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/tutorial/basic/jumpers.txt',
    hint: 'Use jumper to guide your Lix toward the exit. Not yet solution-verified by our browser engine.',
    tutorialFile: 'jumpers'
  },
  'lix-runners': {
    name: 'Runners', category: 'official-tutorial', verified: false,
    intro: 'Original Lix Runners tutorial. Assign runner, climber and jumper skills; browser physics remain an approximate adaptation.',
    credit: 'Original Lix level by Simon, CC0 public-domain dedication.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/tutorial/basic/runners.txt',
    hint: 'Use runner, climber and jumper to guide your Lix toward the exit. Not yet solution-verified by our browser engine.',
    tutorialFile: 'runners'
  },
  'lix-walkers-turn': {
    name: 'Walkers Turn', category: 'official-tutorial', verified: false,
    intro: 'Original Lix Walkers Turn tutorial. Assign walker skills; browser physics remain an approximate adaptation.',
    credit: 'Original Lix level by Wuzzy, CC0 public-domain dedication.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/tutorial/basic/walkers-turn.txt',
    hint: 'Use walker to guide your Lix toward the exit. Not yet solution-verified by our browser engine.',
    tutorialFile: 'walkers-turn'
  },
  'lix-climbers-floaters': {
    name: 'Climbers and Floaters', category: 'official-tutorial', verified: false,
    intro: 'Original Lix Climbers and Floaters tutorial. Assign climber and floater skills; browser physics remain an approximate adaptation.',
    credit: 'Original Lix level by Rubix/Simon, CC0 public-domain dedication.',
    source: 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/tutorial/basic/climbers-floaters.txt',
    hint: 'Use climber and floater to guide your Lix toward the exit. Not yet solution-verified by our browser engine.',
    tutorialFile: 'climbers-floaters'
  },
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
  'secret-passage': {
    name: 'Secret Passage', category: 'advanced', verified: true,
    intro: 'Two abilities, one escape: mine diagonally through the upper shelf, then bash through a lower sandstone wall.',
    credit: 'Original Daily Lemming two-skill puzzle using CC0 Lix artwork.',
    source: 'https://github.com/gurprit/dailylemming/blob/feat/lix-targeting-miner/content/original/secret-passage.txt',
    hint: 'Start with Miner at MINE HERE. After landing in the lower corridor, switch to Basher near BASH HERE.'
  },
  turnaround: {
    name: 'Turnaround', category: 'crowd', verified: true,
    intro: 'Three little Lix are heading toward a dangerous edge. One must become a Blocker to redirect the other two towards freedom.',
    credit: 'Original Daily Lemming Blocker tutorial, CC0 Lix artwork.',
    source: 'https://github.com/gurprit/dailylemming/blob/feat/lix-dirt-particles-blockers/content/original/turnaround.txt',
    hint: 'Choose Blocker and tap the first Lix near BLOCK HERE. Two others will follow and turn around.'
  },
  'bridge-brigade': {
    name: 'Bridge Brigade', category: 'crowd', verified: true,
    intro: 'Protect a small group with a Blocker, then use a Builder to cross the gap and reach the exit.',
    credit: 'Original Daily Lemming crowd and bridge puzzle, using CC0 Lix tiles.',
    source: 'https://github.com/gurprit/dailylemming/blob/feat/lix-dirt-particles-blockers/content/original/bridge-brigade.txt',
    hint: 'First: Block the first Lix near BLOCK HERE. Then: Build near BUILD HERE to bridge the gap.'
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
