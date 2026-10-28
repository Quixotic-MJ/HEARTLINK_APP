import {
  dayKey,
  longestStreak,
  peak,
  periodDays,
  pressureByDay,
  pulseByDay,
  scoreByDay,
  scoreChange,
  scoreRangeByDay,
  scoresOfDay,
  sodiumByDay,
  summarize,
} from "../trends";

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
    expect(s.sleep).toEqual({ perNight: 6.5, nightsLogged: 2, nightsInRange: 1 });
    // 120/80 is not under 130/80 on the bottom number; 130/84 is not either
    expect(s.pressure).toEqual({ average: { sys: 125, dia: 82 }, readings: 2, daysLogged: 2, daysUnder: 0 });
  });

  it("counts a day's blood pressure by its last reading", () => {
    const s = summarize(
      days,
      {
        meals: [],
        exercises: [],
        sleep: [],
        vitals: [{ systolic_bp: 150, diastolic_bp: 92, logged_at: at(2, 7) }, { systolic_bp: 124, diastolic_bp: 76, logged_at: at(2, 19) }],
      },
      { sodiumMg: 1500, movementMin: 30 }
    );
    expect(s.pressure.daysLogged).toBe(1);
    expect(s.pressure.daysUnder).toBe(1);
  });
});

describe("a day's scores", () => {
  // The morning of the first test: setup, a healthy reading, a walk, then an emergency-level reading
  const history = [
    { score: 92, source: "baseline", contributing_factors: {}, computed_at: at(6, 8) },
    { score: 92, source: "telemetry", contributing_factors: { trigger: "health_log", systolic: 118, diastolic: 76 }, computed_at: at(6, 9) },
    { score: 95, source: "telemetry", contributing_factors: { source: "lifestyle_composite", trigger: "exercise_log" }, computed_at: at(6, 10) },
    { score: 20, source: "telemetry", contributing_factors: { trigger: "health_log", systolic: 185, diastolic: 95 }, computed_at: at(6, 11) },
    { score: 70, computed_at: at(5) },
  ];

  it("keeps each day's lowest and highest", () => {
    expect(scoreRangeByDay(days, history).slice(5)).toEqual([{ low: 70, high: 70 }, { low: 20, high: 95 }]);
  });

  it("lists one day's scores in order, each with what set it", () => {
    const list = scoresOfDay(history, days[6]);
    expect(list.map((s) => [s.why, s.score])).toEqual([
      ["Starting score from setup", 92],
      ["Reading 118/76", 92],
      ["Exercise logged", 95],
      ["Reading 185/95, emergency level", 20],
    ]);
    expect(list[3].after).toBe("your 185/95 reading");
  });

  it("finds the longest run of days with a score", () => {
    expect(longestStreak([70, 72, null, 74, 75, 76, null])).toBe(3);
    expect(longestStreak([null, null])).toBe(0);
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
