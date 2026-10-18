import { useCallback, useEffect, useRef, useState } from "react";

/** Calls onFinish once, the first time `reached` turns true (e.g. the planned time is up). */
export function useFinishWhen(reached: boolean, onFinish: () => void) {
  const fired = useRef(false);
  useEffect(() => {
    if (reached && !fired.current) {
      fired.current = true;
      onFinish();
    }
  }, [reached, onFinish]);
}

// Exercise timer. It counts from the phone's clock, not from ticks, so the time stays right when
// the app is in the background, and time spent paused is left out of what gets saved.

type ClockState = { startedAt: number | null; pausedAt: number | null; pausedMs: number };

const IDLE: ClockState = { startedAt: null, pausedAt: null, pausedMs: 0 };

export function elapsedSeconds(c: ClockState, now: number) {
  if (c.startedAt === null) return 0;
  const end = c.pausedAt ?? now;
  return Math.max(0, Math.floor((end - c.startedAt - c.pausedMs) / 1000));
}

export function useSessionClock() {
  const [clock, setClock] = useState<ClockState>(IDLE);
  const [now, setNow] = useState(() => Date.now());

  const running = clock.startedAt !== null && clock.pausedAt === null;
  useEffect(() => {
    if (!running) return;
    // Four times a second, so the clock and step changes land on time.
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setClock({ startedAt: t, pausedAt: null, pausedMs: 0 });
  }, []);
  const pause = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setClock((c) => (c.startedAt === null || c.pausedAt !== null ? c : { ...c, pausedAt: t }));
  }, []);
  const resume = useCallback(() => {
    const t = Date.now();
    setNow(t);
    setClock((c) => (c.pausedAt === null ? c : { ...c, pausedAt: null, pausedMs: c.pausedMs + (t - c.pausedAt) }));
  }, []);
  const reset = useCallback(() => setClock(IDLE), []);

  const elapsedMs = clock.startedAt === null ? 0 : Math.max(0, (clock.pausedAt ?? now) - clock.startedAt - clock.pausedMs);
  return {
    elapsed: elapsedSeconds(clock, now),
    /** The same to the millisecond, so animations can start from the exact spot. */
    elapsedMs,
    paused: clock.pausedAt !== null,
    /** Exact seconds right now, for saving (the shown value can lag by half a second). */
    readSeconds: () => elapsedSeconds(clock, Date.now()),
    start,
    pause,
    resume,
    reset,
  };
}
