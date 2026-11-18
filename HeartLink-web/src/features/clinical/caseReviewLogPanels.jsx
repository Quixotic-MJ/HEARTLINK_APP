import {
  DAILY_SODIUM_LIMIT_MG,
  exerciseRows,
  formatLength,
  mealsByDay,
  sodiumOverDays,
  statusLabel,
} from "./caseReviewLogs.js";

// 2026-11-18: what the patient logged in the 30 days before the case opened, in detail, for the Dietitian (food), the
// Physical Therapist (exercise) and the Cardiologist (both). Admins see counts only (the server sends no detail).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]}, ${MONTHS[m - 1]} ${d}`;
};
const shortDay = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
const amount = (v, unit, digits = 0) => (v == null ? "—" : `${digits ? Math.round(v * 10) / 10 : Math.round(v)} ${unit}`);

function Empty({ children }) {
  return (
    <p className="rounded-[8px] border border-dashed border-cal-hairline bg-cal-surface-soft px-3.5 py-3 text-[13px] text-cal-muted">
      {children}
    </p>
  );
}

function PanelHeading({ title, note }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="text-[14px] font-semibold text-cal-ink">{title}</h3>
      {note ? <p className="text-[12.5px] text-cal-muted">{note}</p> : null}
    </div>
  );
}

export function FoodLogPanel({ timeline, count }) {
  const days = mealsByDay(timeline);
  const { over, logged } = sodiumOverDays(days);
  return (
    <section aria-label="Logged food" className="flex flex-col gap-3">
      <PanelHeading
        title="Food logged, last 30 days"
        note={logged ? `Sodium over ${DAILY_SODIUM_LIMIT_MG.toLocaleString()} mg on ${over} of ${logged} days` : null}
      />
      {days.length === 0 ? (
        <Empty>
          {count > 0
            ? "Food logs are shown to the Dietitian and the Cardiologist."
            : "No food logged in the 30 days before this case opened."}
        </Empty>
      ) : (
        <div className="max-h-[420px] overflow-y-auto rounded-[8px] border border-cal-hairline" tabIndex={0} role="region" aria-label="Food logged by day">
          <table className="w-full border-collapse text-[12.5px]">
            <thead className="sticky top-0 border-b border-cal-hairline bg-cal-surface-soft">
              <tr className="text-left text-cal-muted">
                <th scope="col" className="px-3 py-2 font-medium">Meal</th>
                <th scope="col" className="px-3 py-2 font-medium">Food</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Sodium</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Calories</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Sat. fat</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Fibre</th>
              </tr>
            </thead>
            {days.map((d) => (
              <tbody key={d.day} className="divide-y divide-cal-hairline bg-cal-canvas">
                <tr className="bg-cal-surface-soft/60">
                  <th scope="rowgroup" colSpan={2} className="px-3 py-1.5 text-left text-[12px] font-semibold text-cal-ink">
                    {dayLabel(d.day)}
                  </th>
                  <td colSpan={4} className={`px-3 py-1.5 text-right text-[12px] font-semibold tabular-nums ${d.over ? "text-cal-error" : "text-cal-ink"}`}>
                    {`${d.sodium.toLocaleString()} mg sodium${d.over ? ", over the limit" : ""}`}
                  </td>
                </tr>
                {d.items.map((it, i) => (
                  <tr key={`${d.day}-${i}`}>
                    <td className="px-3 py-2 text-cal-muted">{it.meal}</td>
                    <td className="px-3 py-2 text-cal-ink">
                      {it.name}
                      {it.portion != null && it.portion !== 1 ? (
                        <span className="text-cal-muted">{` × ${Math.round(it.portion * 100) / 100}`}</span>
                      ) : null}
                      {it.fromRecipe ? <span className="ml-1.5 text-[11px] text-cal-muted">HeartLink recipe</span> : null}
                    </td>
                    <td className="px-3 py-2 text-right font-cal-mono tabular-nums text-cal-ink">{amount(it.sodium, "mg")}</td>
                    <td className="px-3 py-2 text-right font-cal-mono tabular-nums text-cal-body">{amount(it.calories, "kcal")}</td>
                    <td className="px-3 py-2 text-right font-cal-mono tabular-nums text-cal-body">{amount(it.satFat, "g", 1)}</td>
                    <td className="px-3 py-2 text-right font-cal-mono tabular-nums text-cal-body">{amount(it.fiber, "g", 1)}</td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </section>
  );
}

export function ExerciseLogPanel({ timeline, count }) {
  const rows = exerciseRows(timeline);
  const finished = rows.filter((r) => r.status === "completed").length;
  return (
    <section aria-label="Logged exercise" className="flex flex-col gap-3">
      <PanelHeading title="Exercise logged, last 30 days" note={rows.length ? `${finished} of ${rows.length} finished` : null} />
      {rows.length === 0 ? (
        <Empty>
          {count > 0
            ? "Exercise logs are shown to the Physical Therapist and the Cardiologist."
            : "No exercise logged in the 30 days before this case opened."}
        </Empty>
      ) : (
        <div className="max-h-[360px] overflow-y-auto rounded-[8px] border border-cal-hairline" tabIndex={0} role="region" aria-label="Exercise logged">
          <table className="w-full border-collapse text-[12.5px]">
            <thead className="sticky top-0 border-b border-cal-hairline bg-cal-surface-soft">
              <tr className="text-left text-cal-muted">
                <th scope="col" className="px-3 py-2 font-medium">Date</th>
                <th scope="col" className="px-3 py-2 font-medium">Exercise</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">How long</th>
                <th scope="col" className="px-3 py-2 font-medium">Result</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Effort</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cal-hairline bg-cal-canvas">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-cal-body">{shortDay(r.timestamp)}</td>
                  <td className="px-3 py-2 text-cal-ink">{r.name}</td>
                  <td className="px-3 py-2 text-right font-cal-mono tabular-nums text-cal-ink">
                    {formatLength(r.seconds)}
                    {r.planned ? <span className="text-cal-muted">{` of ${r.planned} min`}</span> : null}
                  </td>
                  <td className={`px-3 py-2 ${r.status === "incomplete_due_to_symptoms" ? "font-semibold text-cal-error" : "text-cal-body"}`}>
                    {statusLabel(r.status)}
                  </td>
                  <td className="px-3 py-2 text-right font-cal-mono tabular-nums text-cal-body">
                    {r.effort == null ? "—" : `${r.effort}/10`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
