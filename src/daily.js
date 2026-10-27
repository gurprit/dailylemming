// The UTC date is the shared puzzle boundary worldwide.
export const LAUNCH_DAY = '2026-10-26';
const STORAGE_KEY = 'daily-lemming-results-v1';

export function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
export function dayNumber(day, launch = LAUNCH_DAY) {
  const ms = Date.parse(day + 'T00:00:00.000Z') - Date.parse(launch + 'T00:00:00.000Z');
  return Math.floor(ms / 86400000);
}
export function indexForDay(day, levelCount) {
  if (!Number.isInteger(levelCount) || levelCount < 1) throw new Error('No levels available');
  const n = Math.max(0, dayNumber(day));
  // A stable rotation, not Math.random(), so all players see the same challenge.
  return ((n * 5 + Math.floor(n / 7)) % levelCount + levelCount) % levelCount;
}
export function readProgress(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
export function saveResult(day, result, storage = globalThis.localStorage) {
  const progress = readProgress(storage);
  const prev = progress[day];
  const record = { saved: result.saved, total: result.total, won: result.won,
    seconds: result.seconds, used: result.used };
  const best = !prev || record.saved > prev.best.saved
    || (record.saved === prev.best.saved && record.seconds < prev.best.seconds)
    ? record : prev.best;
  progress[day] = { first: prev?.first || record, best, won: Boolean(prev?.won || record.won) };
  storage.setItem(STORAGE_KEY, JSON.stringify(progress));
  return progress[day];
}
export function streak(progress, today) {
  let cursor = today;
  if (!progress[cursor]?.won) {
    const yesterday = new Date(Date.parse(today + 'T00:00:00Z') - 86400000);
    cursor = utcDay(yesterday);
  }
  let count = 0;
  while (progress[cursor]?.won) {
    count++;
    cursor = utcDay(new Date(Date.parse(cursor + 'T00:00:00Z') - 86400000));
  }
  return count;
}
export function shareText(day, result, dayIndex) {
  const blocks = result.saved === result.total ? '🟩🟩🟩🟩🟩'
    : '🟩'.repeat(Math.round(5 * result.saved / result.total)) +
      '⬛'.repeat(5 - Math.round(5 * result.saved / result.total));
  return 'Daily Lemming #' + (dayIndex + 1) + ' · ' + day + '\n'
    + blocks + '\n'
    + 'Rescued ' + result.saved + '/' + result.total
    + ' · ' + result.used + ' skills · ' + result.seconds + 's\n'
    + 'Can you guide them home?';
}
