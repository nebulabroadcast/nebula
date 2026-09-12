import { DateTime } from 'luxon';
import { RRule, Frequency, Weekday } from 'rrule';

export type RecurrenceFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type RecurrenceEndMode = 'never' | 'until' | 'count';

// Mon..Sun in display order, luxonWeekday uses luxon numbering (Mon=1..Sun=7)
export const WEEKDAYS: Array<{
  label: string;
  rruleDay: Weekday;
  luxonWeekday: number;
}> = [
  { label: 'Mon', rruleDay: RRule.MO, luxonWeekday: 1 },
  { label: 'Tue', rruleDay: RRule.TU, luxonWeekday: 2 },
  { label: 'Wed', rruleDay: RRule.WE, luxonWeekday: 3 },
  { label: 'Thu', rruleDay: RRule.TH, luxonWeekday: 4 },
  { label: 'Fri', rruleDay: RRule.FR, luxonWeekday: 5 },
  { label: 'Sat', rruleDay: RRule.SA, luxonWeekday: 6 },
  { label: 'Sun', rruleDay: RRule.SU, luxonWeekday: 7 },
];

const FREQ_MAP: Record<RecurrenceFreq, Frequency> = {
  DAILY: RRule.DAILY,
  WEEKLY: RRule.WEEKLY,
  MONTHLY: RRule.MONTHLY,
  YEARLY: RRule.YEARLY,
};

// Rough per-period length used to shift dtstart back far enough while
// staying phase-aligned with the anchor (whole multiples of the period).
const PERIOD_DAYS: Record<RecurrenceFreq, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 31, // shifting by whole months below, this is only a safety margin
  YEARLY: 366,
};

export interface RecurrenceOptions {
  freq: RecurrenceFreq;
  interval: number;
  byweekday: number[]; // luxon weekday numbers (1=Mon..7=Sun), only used for WEEKLY
  endMode: RecurrenceEndMode;
  until?: DateTime | null;
  count?: number | null;
}

interface ComputeOccurrencesArgs {
  anchor: DateTime;
  options: RecurrenceOptions;
  forwardCount: number;
  backwardCount: number;
}

const toRRuleOptions = (options: RecurrenceOptions) => {
  const byweekday =
    options.freq === 'WEEKLY' && options.byweekday.length > 0
      ? options.byweekday
          .map((lw) => WEEKDAYS.find((w) => w.luxonWeekday === lw)?.rruleDay)
          .filter((d): d is Weekday => Boolean(d))
      : undefined;

  return {
    freq: FREQ_MAP[options.freq],
    interval: Math.max(1, options.interval || 1),
    byweekday,
  };
};

// UNTIL and COUNT are classic RRULE end conditions counted from dtstart (the
// anchor), so they only bound the forward direction - backward fill is
// already bounded by how many earlier episodes exist.
const applyEndCondition = (
  occurrences: DateTime[],
  options: RecurrenceOptions
): DateTime[] => {
  if (options.endMode === 'until' && options.until) {
    // until is picked as a date, so include episodes airing on that day
    const until = options.until.endOf('day');
    return occurrences.filter((d) => d <= until);
  }
  if (options.endMode === 'count' && options.count) {
    // N occurrences total, including the anchor itself
    return occurrences.slice(0, Math.max(0, options.count - 1));
  }
  return occurrences;
};

/**
 * Compute episode air dates around an anchor date, both forward and
 * backward, using an RRULE-style recurrence. RRULE only generates
 * occurrences forward from dtstart, so "backward" occurrences are computed
 * by re-anchoring dtstart far enough in the past (in whole periods, to stay
 * phase-aligned) and taking the tail of that forward sequence.
 */
export const computeOccurrences = ({
  anchor,
  options,
  forwardCount,
  backwardCount,
}: ComputeOccurrencesArgs): { forward: DateTime[]; backward: DateTime[] } => {
  const ruleOptions = toRRuleOptions(options);

  // Forward: anchor is occurrence 0, we need `forwardCount` more after it.
  let forward: DateTime[] = [];
  if (forwardCount > 0) {
    const rule = new RRule({
      ...ruleOptions,
      dtstart: anchor.toJSDate(),
    });
    const raw = rule.all((_date, i) => i <= forwardCount);
    forward = raw.slice(1).map((d) => DateTime.fromJSDate(d, { zone: anchor.zone }));
    forward = applyEndCondition(forward, options);
  }

  // Backward: shift dtstart back by whole periods so the recurrence phase
  // (weekday/time-of-day) still lines up with the anchor, then take the
  // occurrences strictly before the anchor.
  let backward: DateTime[] = [];
  if (backwardCount > 0) {
    const margin = backwardCount + 4; // safety buffer for byweekday filtering
    const shiftedStart = shiftBack(anchor, options.freq, options.interval, margin);
    const rule = new RRule({
      ...ruleOptions,
      dtstart: shiftedStart.toJSDate(),
    });
    const raw = rule.between(shiftedStart.toJSDate(), anchor.toJSDate(), false);
    const all = raw.map((d) => DateTime.fromJSDate(d, { zone: anchor.zone }));
    backward = all.slice(-backwardCount);
  }

  return { forward, backward };
};

const shiftBack = (
  anchor: DateTime,
  freq: RecurrenceFreq,
  interval: number,
  periods: number
): DateTime => {
  const n = Math.max(1, interval || 1) * periods;
  switch (freq) {
    case 'DAILY':
      return anchor.minus({ days: n * PERIOD_DAYS.DAILY });
    case 'WEEKLY':
      return anchor.minus({ weeks: n });
    case 'MONTHLY':
      return anchor.minus({ months: n });
    case 'YEARLY':
      return anchor.minus({ years: n });
    default:
      return anchor.minus({ days: n * PERIOD_DAYS[freq] });
  }
};
