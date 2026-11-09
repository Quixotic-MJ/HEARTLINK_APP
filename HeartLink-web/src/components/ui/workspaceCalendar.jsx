import { useId, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { manilaDateParts, monthDays, moveMonth } from "../../utils/calendar.js";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WorkspaceCalendar() {
  const id = useId();
  const today = manilaDateParts();
  const [month, setMonth] = useState(() => ({ year: today.year, month: today.month }));
  const label = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(month.year, month.month, 1)));
  return (
    <section className="workspace-calendar" aria-labelledby={id}>
      <div className="workspace-calendar-caption">
        <h2 id={id}>Calendar</h2>
        <button type="button" onClick={() => setMonth({ year: today.year, month: today.month })}>Today</button>
      </div>
      <div className="workspace-calendar-navigation">
        <p aria-live="polite" aria-atomic="true">{label}</p>
        <div>
          <button type="button" aria-label="Previous month" onClick={() => setMonth((current) => moveMonth(current.year, current.month, -1))}>
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next month" onClick={() => setMonth((current) => moveMonth(current.year, current.month, 1))}>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <table aria-label={label}>
        <thead><tr>{WEEKDAYS.map((day) => <th key={day} scope="col"><abbr title={day}>{day.slice(0, 2)}</abbr></th>)}</tr></thead>
        <tbody>{monthDays(month.year, month.month).map((week, index) => (
          <tr key={index}>{week.map((day, weekday) => {
            const isToday = day === today.day && month.month === today.month && month.year === today.year;
            return <td key={weekday}>{day !== null && <time dateTime={`${month.year}-${String(month.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`} aria-current={isToday ? "date" : undefined}>{day}</time>}</td>;
          })}</tr>
        ))}</tbody>
      </table>
      <p className="workspace-calendar-note">Date reference · Asia/Manila</p>
    </section>
  );
}
