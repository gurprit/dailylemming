// An independent local practice record. Never touches daily challenge streaks.
const KEY = 'daily-lemming-lix-practice-v2';

export function getPractice(storage = globalThis.localStorage) {
  try {
    const read = JSON.parse(storage?.getItem(KEY) || '{}');
    return read && typeof read === 'object'
      ? { attempts: Number(read.attempts) || 0,
          wins: Number(read.wins) || 0,
          best: read.best || null } : { attempts: 0, wins: 0, best: null };
  } catch {
    return { attempts: 0, wins: 0, best: null };
  }
}
export function savePractice(result, storage = globalThis.localStorage) {
  const prev = getPractice(storage);
  const record = { attempts: prev.attempts + 1,
    wins: prev.wins + (result.won ? 1 : 0), best: prev.best };
  const next = { used: result.used, seconds: result.seconds };
  const improved = Boolean(result.won) && (!record.best
    || next.used < record.best.used
    || (next.used === record.best.used && next.seconds < record.best.seconds));
  if (improved) record.best = next;
  try { storage?.setItem(KEY, JSON.stringify(record)); } catch {}
  return { ...record, improved };
}
export function practiceLabel(record) {
  if (!record.best) return record.attempts
    ? record.attempts + ' attempts · no rescue yet' : 'Your first rescue awaits';
  return 'Best: ' + record.best.used + ' builders · ' + record.best.seconds
    + 's · ' + record.wins + '/' + record.attempts + ' successful runs';
}
