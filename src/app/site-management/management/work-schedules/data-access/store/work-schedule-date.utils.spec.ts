import { addWeeks, formatDate, getWeekDates, getWeekEndDate, getWeekStart } from './work-schedule-date.utils';

describe('work schedule date utils', () => {
  it('uses monday as the week start', () => {
    expect(formatDate(getWeekStart(new Date(2026, 4, 31)))).toBe('2026-05-25');
    expect(formatDate(getWeekStart(new Date(2026, 4, 27)))).toBe('2026-05-25');
  });

  it('builds a seven day week range', () => {
    expect(getWeekDates('2026-05-25')).toEqual([
      '2026-05-25',
      '2026-05-26',
      '2026-05-27',
      '2026-05-28',
      '2026-05-29',
      '2026-05-30',
      '2026-05-31',
    ]);
    expect(getWeekEndDate('2026-05-25')).toBe('2026-05-31');
  });

  it('moves by whole weeks without mutating the source date', () => {
    const source = new Date(2026, 4, 25);

    expect(formatDate(addWeeks(source, 1))).toBe('2026-06-01');
    expect(formatDate(source)).toBe('2026-05-25');
  });
});
