export const CALENDAR_TIME_ZONE = "Asia/Manila";

export function manilaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const value = (type) => Number(parts.find((part) => part.type === type).value);
  return { year: value("year"), month: value("month") - 1, day: value("day") };
}

export function monthDays(year, month) {
  const start = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Array.from({ length: Math.ceil((start + count) / 7) }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const day = week * 7 + weekday - start + 1;
      return day > 0 && day <= count ? day : null;
    }),
  );
}

export function moveMonth(year, month, offset) {
  const date = new Date(Date.UTC(year, month + offset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}
