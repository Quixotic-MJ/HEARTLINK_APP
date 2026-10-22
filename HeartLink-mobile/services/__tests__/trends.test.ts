import { dayKey, peak, periodDays, pressureByDay, pulseByDay, scoreByDay, scoreChange, sodiumByDay, summarize } from "../trends";

// A Sunday, so the week runs Monday to Sunday.
const NOW = new Date(2026, 9, 25, 18, 0);
const days = periodDays(7, NOW);
const at = (dayOffset: number, hour = 9) => new Date(2026, 9, 19 + dayOffset, hour).toISOString();

describe("periodDays", () => {
  it("lists the last N days, oldest first, ending today", () => {
    expect(days).toHaveLength(7);
    expect(days[0].key).toBe("2026-10-19");
    expect(days[6].key).toBe(dayKey(NOW));
  });
});

describe("daily series", () => {
  it("leaves days with nothing logged empty instead of filling them in", () => {
    const scores = scoreByDay(days, [{ score: 76, computed_at: at(0) }, { score: 80, computed_at: at(3) }]);
    expect(scores).toEqual([76, null, null, 80, null, null, null]);
  });

  it("takes the day's last reading for blood pressure and pulse", () => {
    const vitals = [
      { systolic_bp: 140, diastolic_bp: 90, heart_rate_bpm: 80, logged_at: at(1, 8) },
      { systolic_bp: 128, diastolic_bp: 82, heart_rate_bpm: 72, logged_at: at(1, 20) },
    ];
    expect(pressureByDay(days, vitals)[1]).toEqual({ sys: 128, dia: 82 });
    expect(pulseByDay(days, vitals)[1]).toBe(72);
    expect(pressureByDay(days, vitals)[0]).toBeNull();
  });

  it("adds up sodium per day", () => {
    const meals = [{ sodium_mg: 600, logged_at: at(1, 8) }, { sodium_mg: 1220, logged_at: at(1, 19) }];
    expect(sodiumByDay(days, meals)[1]).toBe(1820);
    expect(sodiumByDay(days, meals)[2]).toBeNull();
  });
});

describe("summarize", () => {
  it("averages sodium over logged days and movement over the whole period", () => {
    const s = summarize(
      days,
      {
        meals: [{ sodium_mg: 1820, logged_at: at(1) }, { sodium_mg: 900, logged_at: at(2) }],
        exercises: [{ duration_minutes: 35, logged_at: at(0) }, { duration_minutes: 35, logged_at: at(4) }],
        sleep: [{ duration_hours: 7, logged_at: at(0) }, { duration_hours: 6, logged_at: at(1) }],
        vitals: [{ systolic_bp: 120, diastolic_bp: 80, logged_at: at(0) }, { systolic_bp: 130, diastolic_bp: 84, logged_at: at(5) }],
      },
      { sodiumMg: 1500, movementMin: 30 }
    );
    expect(s.sodium).toEqual({ perDay: 1360, daysLogged: 2, daysOver: 1 });
    expect(s.movement).toEqual({ perDay: 10, daysAtGoal: 2 });
    expect(s.sleep).toEqual({ perNight: 6.5, nightsLogged: 2 });
    expect(s.pressure).toEqual({ average: { sys: 125, dia: 82 }, readings: 2 });
  });
});

describe("highlights", () => {
  it("finds the best day and says how the score moved", () => {
    const scores = [76, 78, null, 80, 79, 82, 82];
    expect(peak(days, scores)?.value).toBe(82);
    expect(scoreChange(days, scores, NOW)).toBe("Up 6 points since Monday");
    expect(scoreChange(days, [null, null, 70, null, null, null, null], NOW)).toBeNull();
  });
});
