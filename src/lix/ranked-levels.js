// Lix's official lemforum pack ordering (source: levels/single/lemforum/_order.X.txt).
// Selected ranked maps are previews: gameplay parity and full winning routes
// have NOT been verified. The shared scored daily pool remains independent.
import { utcDay, dayNumber } from '../daily.js';
import { FEATURED_COMMUNITY_LEVELS } from './featured-levels.js';

export const LIX_RANKS = Object.freeze([
  {
    "id": "lovely",
    "name": "Lovely",
    "order": 1
  },
  {
    "id": "quirky",
    "name": "Quirky",
    "order": 2
  },
  {
    "id": "cunning",
    "name": "Cunning",
    "order": 3
  },
  {
    "id": "daunting",
    "name": "Daunting",
    "order": 4
  },
  {
    "id": "vicious",
    "name": "Vicious",
    "order": 5
  },
  {
    "id": "hopeless",
    "name": "Hopeless",
    "order": 6
  }
]);
export const RANKED_POOLS = Object.freeze({
  lovely: FEATURED_COMMUNITY_LEVELS,
  quirky: Object.freeze(["quirky-flugtag","quirky-loggingyourprog"]),
  cunning: Object.freeze(["cunning-lix","cunning-onceyoupop"]),
  daunting: Object.freeze(["daunting-backslash","daunting-roundtrip"]),
  vicious: Object.freeze(["vicious-endeavor","vicious-getbehindmesatan"]),
  hopeless: Object.freeze(["hopeless-emptyspace","hopeless-dontcatchmeifyoucan"]),
});
export function isRank(rank) {
  return typeof rank === 'string' && Object.hasOwn(RANKED_POOLS, rank);
}
export function rankedLevel(rank, day = utcDay()) {
  if (!isRank(rank)) return null;
  const pool = RANKED_POOLS[rank];
  const n = Math.max(0, dayNumber(day));
  return { day, rank, levelId: pool[n % pool.length], challenge: false };
}
