/**
 * Schedule time utilities for same-day job buffer validation.
 * Time slots are stored as strings like "10:00 AM", "12:00 PM"; we convert to minutes from midnight.
 */

const MIN_BUFFER_MINUTES = 120; // 2 hours

/**
 * Parses a timeSlot string (e.g. "10:00 AM", "12:00 PM", "2:00 PM") to minutes from midnight (0-1439).
 */
export function timeSlotToMinutes(timeSlot: string): number {
  const trimmed = (timeSlot || '').trim();
  const match = trimmed.match(/^\s*(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)\s*$/i);
  if (!match) {
    throw new Error(`Invalid time slot format: ${timeSlot}`);
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = (match[3] || '').toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time: ${timeSlot}`);
  }
  return hours * 60 + minutes;
}

/**
 * Returns start and end minutes-from-midnight for a job on the given schedule.
 */
export function scheduleToMinutesRange(
  timeSlot: string,
  durationMinutes: number
): { startMinutes: number; endMinutes: number } {
  const startMinutes = timeSlotToMinutes(timeSlot);
  const endMinutes = startMinutes + durationMinutes;
  return { startMinutes, endMinutes };
}

/**
 * Checks whether two jobs on the same day satisfy the minimum 2-hour buffer.
 * Allowed if: new starts >= 2h after existing ends, OR new ends <= 2h before existing starts.
 */
export function satisfiesBuffer(
  existingStart: number,
  existingEnd: number,
  newStart: number,
  newEnd: number,
  bufferMinutes: number = MIN_BUFFER_MINUTES
): boolean {
  const newStartsAfterGap = newStart >= existingEnd + bufferMinutes;
  const newEndsBeforeGap = newEnd <= existingStart - bufferMinutes;
  return newStartsAfterGap || newEndsBeforeGap;
}

export { MIN_BUFFER_MINUTES };
