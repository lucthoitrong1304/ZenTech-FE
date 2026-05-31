const DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatDate(value: Date): string {
  return DATE_FORMATTER.format(value);
}

export function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day);
}

export function getWeekStart(value: Date): Date {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  date.setDate(date.getDate() + mondayOffset);

  return date;
}

export function addDays(value: Date, days: number): Date {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  date.setDate(date.getDate() + days);

  return date;
}

export function addWeeks(value: Date, weeks: number): Date {
  return addDays(value, weeks * 7);
}

export function getWeekDates(weekStartDate: string): string[] {
  const start = parseDate(weekStartDate);

  return Array.from({ length: 7 }, (_, index) => formatDate(addDays(start, index)));
}

export function getWeekEndDate(weekStartDate: string): string {
  return formatDate(addDays(parseDate(weekStartDate), 6));
}
