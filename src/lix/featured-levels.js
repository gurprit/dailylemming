// Today's showcase is deterministic for everyone on the same UTC date,
// but deliberately shuffled to evoke opening a random mid-game Lix puzzle.
// Unverified community puzzles never enter the scored/streak daily pool.
import { dayNumber, utcDay } from '../daily.js';
export const FEATURED_COMMUNITY_LEVELS = Object.freeze([
  'lovely-pipedream', 'lovely-beneaththelab', 'lovely-climbtofreedom',
  'lovely-everylix', 'lovely-escapethepit', 'lovely-pitfall',
  'lovely-putyourlix', 'lovely-solareclipse', 'lovely-alternative',
  'lovely-anecklaceofraindrops'
]);
export function mysteryLevel(day = utcDay()) {
  const n = Math.max(0, dayNumber(day));
  const block = Math.floor(n / FEATURED_COMMUNITY_LEVELS.length);
  const order = [...FEATURED_COMMUNITY_LEVELS];
  let seed = (Math.imul(block+1, 0x9e3779b1) ^ 0x86c8da9d) >>> 0;
  for(let i=order.length-1;i>0;i--) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const j=(seed>>>0) % (i+1);
    [order[i],order[j]]=[order[j],order[i]];
  }
  return { day, levelId: order[n % order.length], challenge: false };
}
