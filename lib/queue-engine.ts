import { QueueEntry } from '../types/app';

/**
 * Sorts the queue based on locked status, ETA, and scheduled time.
 * 
 * Test 1: 3 patients, all uncertain → order preserved by scheduled_time
 * Example: [{time: "10:00", status: "uncertain"}, {time: "09:00", status: "uncertain"}] -> Sorted by 09:00 first.
 * 
 * Test 2: 2 known ETA (8min, 15min) + 1 uncertain → known sorted first
 * Example: [{eta: 900, status: "known"}, {eta: 480, status: "known"}, {status: "uncertain"}] -> 480, 900, uncertain.
 * 
 * Test 3: 1 locked at position 2, 2 known ETA → locked stays at 2
 * Example: [{eta: 100, status: "known", pos: 1}, {eta: 500, status: "known", pos: 2, locked: true}, {eta: 50, status: "known", pos: 3}] 
 * -> Result: pos 1: 50 (known), pos 2: 500 (locked), pos 3: 100 (known).
 * 
 * @param entries The list of queue entries to sort.
 * @returns A new array of queue entries with updated positions.
 */
export function sortQueue(entries: QueueEntry[]): QueueEntry[] {
  if (entries.length === 0) return [];

  // 1. Separate entries into 3 groups
  const locked = entries.filter(e => e.is_locked);
  const knownEta = entries
    .filter(e => !e.is_locked && e.eta_status === 'known')
    // 2. Sort knownEta by eta_seconds ASC
    .sort((a, b) => (a.eta_seconds ?? 0) - (b.eta_seconds ?? 0));
  
  const uncertain = entries
    .filter(e => !e.is_locked && e.eta_status !== 'known')
    // 3. Sort uncertain by original scheduled_time ASC
    .sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

  // 4. Build the output
  const result: QueueEntry[] = new Array(entries.length);
  
  // Create a map of locked positions for quick lookup (1-indexed)
  const lockedMap = new Map<number, QueueEntry>();
  locked.forEach(e => {
    // If multiple items claim the same locked position, we just take the last one or handle as best effort.
    // Ideally positions should be unique.
    lockedMap.set(e.position, e);
  });

  let knownIdx = 0;
  let uncertainIdx = 0;

  for (let i = 1; i <= entries.length; i++) {
    let entry: QueueEntry;

    if (lockedMap.has(i)) {
      entry = { ...lockedMap.get(i)! };
    } else if (knownIdx < knownEta.length) {
      entry = { ...knownEta[knownIdx++] };
    } else {
      entry = { ...uncertain[uncertainIdx++] };
    }

    // 5. Update position value (1-indexed)
    entry.position = i;
    result[i - 1] = entry;
  }

  return result;
}
