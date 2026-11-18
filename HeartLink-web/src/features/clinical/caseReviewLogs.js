// 2026-11-18: the food and exercise a patient logged in the 30 days before a case opened, laid out for the expert whose
// part it is. The server only sends them to those experts (review_sections.timeline_for); Admins get counts only.

export const DAILY_SODIUM_LIMIT_MG = 1500;

const num = (v) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

/** "YYYY-MM-DD" in the viewer's local time, so a day's meals stay together. */
export function localDay(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The meal a log belongs to: the one chosen when logging, else its clock time (as the phone's Food Diary does). */
export function mealOf(entry) {
  const chosen = entry?.data?.time_of_meal;
  if (["Breakfast", "Lunch", "Dinner", "Snack"].includes(chosen)) return chosen;
  const h = new Date(entry?.timestamp).getHours();
  if (h >= 4 && h < 11) return "Breakfast";
  if (h >= 11 && h < 16) return "Lunch";
  if (h >= 16 && h < 22) return "Dinner";
  return "Snack";
}

/** Meals grouped by day, newest day first, each with its sodium total and whether it went over the limit. */
export function mealsByDay(timeline, limitMg = DAILY_SODIUM_LIMIT_MG) {
  const days = new Map();
  for (const t of timeline || []) {
    if (t?.type !== "Meal") continue;
    const key = localDay(t.timestamp);
    if (!key) continue;
    if (!days.has(key)) days.set(key, []);
    const d = t.data || {};
    days.get(key).push({
      timestamp: t.timestamp,
      meal: mealOf(t),
      name: d.meal_name || "Unnamed food",
      portion: num(d.portion),
      sodium: num(d.sodium_mg),
      calories: num(d.calories),
      satFat: num(d.saturated_fat_g),
      fiber: num(d.fiber_g),
      fromRecipe: !!d.from_recipe,
    });
  }
  const order = { Breakfast: 0, Lunch: 1, Dinner: 2, Snack: 3 };
  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([dayKey, items]) => {
      const sodium = items.reduce((sum, it) => sum + (it.sodium || 0), 0);
      return {
        day: dayKey,
        items: items.sort((a, b) => order[a.meal] - order[b.meal] || (a.timestamp < b.timestamp ? -1 : 1)),
        sodium: Math.round(sodium),
        over: sodium > limitMg,
      };
    });
}

/** Days over the sodium limit, out of the days with meals logged. */
export function sodiumOverDays(days) {
  return { over: days.filter((d) => d.over).length, logged: days.length };
}

/** Exercise logs, newest first, with how long they really lasted. */
export function exerciseRows(timeline) {
  return (timeline || [])
    .filter((t) => t?.type === "Exercise")
    .map((t) => {
      const d = t.data || {};
      const seconds = num(d.duration_seconds) ?? (num(d.duration_minutes) != null ? num(d.duration_minutes) * 60 : null);
      return {
        timestamp: t.timestamp,
        name: d.routine_name || "Exercise",
        seconds,
        planned: num(d.planned_duration_minutes),
        status: d.status || "",
        effort: num(d.effort_rating),
      };
    })
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

/** 75 → "1 min 15 s", 40 → "40 s" */
export function formatLength(seconds) {
  if (seconds == null) return "Not recorded";
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  if (!m) return `${s} s`;
  return s % 60 ? `${m} min ${s % 60} s` : `${m} min`;
}

export function statusLabel(status) {
  if (status === "completed") return "Finished";
  if (status === "incomplete_due_to_symptoms") return "Stopped, felt unwell";
  if (status === "abandoned" || status === "incomplete") return "Stopped early";
  return status ? status.replace(/_/g, " ") : "Not recorded";
}

/** The line under a recommended recipe or exercise: what an expert needs to judge it. */
export function itemFacts(item, kind) {
  if (!item) return [];
  const parts = [];
  if (kind === "recipe") {
    if (item.category) parts.push(item.category);
    if (num(item.sodium_mg) != null) parts.push(`${Math.round(item.sodium_mg)} mg sodium`);
    if (num(item.calories) != null) parts.push(`${Math.round(item.calories)} kcal`);
    if (num(item.saturated_fat_g) != null) parts.push(`${Math.round(item.saturated_fat_g * 10) / 10} g saturated fat`);
  } else {
    if (item.type) parts.push(item.type);
    if (item.intensity && item.intensity !== "None") parts.push(`${item.intensity} intensity`);
    if (num(item.duration_minutes) != null) parts.push(`${item.duration_minutes} min`);
    if (item.position) parts.push(item.position);
  }
  return parts;
}
