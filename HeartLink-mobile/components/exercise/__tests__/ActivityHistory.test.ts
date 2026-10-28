import { logDetail, ExerciseLog } from "../../../app/(home)/(health)/exercise-diary";

// Activity history: each row says the date as well as the time, so a row still makes sense on its own.

const log = (logged_at: string, minutes: number): ExerciseLog => ({
  id: "1",
  user_id: "u",
  routine_name: "Walking",
  duration_minutes: minutes,
  status: "completed",
  logged_at,
});

it("shows the date, time and length of a session", () => {
  const at = new Date(2026, 9, 28, 8, 39);
  expect(logDetail(log(at.toISOString(), 30))).toBe(
    `${at.toLocaleDateString([], { month: "short", day: "numeric" })}, ${at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}, 30 min`,
  );
  expect(logDetail(log(at.toISOString(), 30))).toMatch(/^Oct 28, /);
});
