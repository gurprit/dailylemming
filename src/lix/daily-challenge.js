// Stable shared daily rotation for the actual Lix-art game.
// Only engine-solved, real-art verified levels belong in this pool. The
// original Lix tutorial imports are practice-only until solution-verified.
import { dayNumber, utcDay, streak, shareText } from '../daily.js';
import { LEVEL_OPTIONS } from './level-options.js';

export const DAILY_POOL = Object.freeze([
  'little-bridge',
  'tunnel-time',
  'dig-for-freedom',
  'turnaround',
  'double-trouble',
  'bridge-brigade',
  'secret-passage'
]);
export const DAILY_STORAGE_KEY = 'daily-lemming-lix-challenge-v1';

export function dailyChallenge(day = utcDay()) {
  const n = Math.max(0, dayNumber(day));
  const id = DAILY_POOL[n % DAILY_POOL.length];
  if (!LEVEL_OPTIONS[id]?.verified) throw Error('Unverified level in daily rotation: ' + id);
  return { day, number: n + 1, levelId: id };
}
export function readDaily(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem(DAILY_STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
const normalized = result => ({
  won: Boolean(result.won),
  saved: Math.max(0, Number(result.saved) || 0),
  total: Math.max(1, Number(result.total) || 1),
  used: Math.max(0, Number(result.used) || 0),
  seconds: Math.max(0, Number(result.seconds) || 0)
});
export function saveDaily(day, levelId, result, storage = globalThis.localStorage) {
  if (dailyChallenge(day).levelId !== levelId)
    throw Error('Cannot record an attempt for the wrong daily puzzle');
  const all = readDaily(storage);
  const previous = all[day];
  const attempt = normalized(result);
  const best = !previous || attempt.saved > previous.best.saved
    || (attempt.saved === previous.best.saved && attempt.used < previous.best.used)
    || (attempt.saved === previous.best.saved && attempt.used === previous.best.used
      && attempt.seconds < previous.best.seconds)
    ? attempt : previous.best;
  const record = {
    levelId, first: previous?.first || attempt, best,
    attempts: (previous?.attempts || 0) + 1,
    won: Boolean(previous?.won || attempt.won)
  };
  all[day] = record;
  try { storage?.setItem(DAILY_STORAGE_KEY, JSON.stringify(all)); } catch {}
  return record;
}
export function dailyStreak(day = utcDay(), storage = globalThis.localStorage) {
  return streak(readDaily(storage), day);
}
export function dailyResultText(day, recordOrAttempt) {
  const info = dailyChallenge(day);
  const result = recordOrAttempt?.best || recordOrAttempt;
  return shareText(day, normalized(result), info.number - 1);
}
