import { useEffect, useMemo, useRef } from "react";
import type { VoiceGuide } from "./useVoiceGuide";
import * as Haptics from "expo-haptics";
import { Routine, SECTION_NAME, Segment, buildTimeline, segmentAt, spokenStep, timelineSeconds } from "../services/exerciseSession";

// Where the patient is in an exercise's timeline (warm-up, rounds, rests, cool-down), and the
// spoken guidance that goes with it, so they can follow along without looking at the phone.

export function useTimelinePlayback(routine: Routine, elapsedMs: number, skipSeconds = 0) {
  const timeline = useMemo(() => buildTimeline(routine), [routine]);
  const total = timelineSeconds(timeline);
  const position = Math.min(total, Math.max(0, elapsedMs / 1000 + skipSeconds));
  const at = segmentAt(timeline, position);
  const next = timeline[at.index + 1];
  return { timeline, total, position, ...at, next, remaining: at.segment ? at.segment.seconds - at.elapsed : 0 };
}

const clean = (s: string) => s.trim().replace(/\.$/, "");

/** What's said when a segment starts: the section, the round, the side, then the instruction. */
export function segmentIntro(seg: Segment, prev: Segment | undefined) {
  if (seg.kind === "rest") return `Rest for ${seg.seconds} seconds. Breathe easy.`;
  const parts: string[] = [];
  if (!prev || prev.section !== seg.section) {
    // Not when the step already says it ("Warm up with light stretching").
    const saysItself = /^(warm|cool)(ing)?[\s-]?(up|down)\b/i.test(seg.step?.text ?? "");
    if (!saysItself) parts.push(seg.section === "warmup" ? "Let's warm up." : seg.section === "cooldown" ? "Time to cool down." : prev ? "Now the main part." : "");
  }
  if (seg.section === "main" && seg.rounds > 1 && (!prev || prev.kind === "rest" || prev.round !== seg.round)) parts.push(`Round ${seg.round} of ${seg.rounds}.`);
  if (seg.side === 2) parts.push("Now the other side.");
  parts.push(seg.side === 2 ? clean(seg.step?.text ?? "") : spokenStep(seg.step));
  return parts.filter(Boolean).join(" ");
}

/**
 * A short name for what comes next, for "Next: …". Moving into a new section names the section
 * ("the main part"), so the instruction itself is only said once, when it starts.
 */
export function nextName(next: Segment | undefined, current?: Segment) {
  if (!next) return "";
  if (next.kind === "rest") return "a short rest";
  if (next.side === 2) return "the other side";
  if (current && current.kind === "part" && next.section !== current.section) {
    return next.section === "main" ? "the main part" : next.section === "cooldown" ? "the cool-down" : "the warm-up";
  }
  return clean(next.step?.text ?? "");
}

/**
 * The warning 10 seconds before a change. It never says the next instruction itself, which is
 * said in full when it starts (saying it twice sounded like the exercise repeating).
 */
export function headsUp(current: Segment | undefined, next: Segment | undefined) {
  if (!next) return "Almost done. 10 seconds to go.";
  if (current?.kind === "rest") return `Round ${next.round} starts in 10 seconds.`;
  if (next.kind === "rest") return "10 seconds, then a short rest.";
  if (next.side === 2) return "10 seconds, then the other side.";
  if (current && next.section !== current.section) return `Next, in 10 seconds: ${nextName(next, current)}.`;
  return "10 seconds left on this move.";
}

/**
 * Speaks the guidance: each new segment (with a tap on the phone), "Next: …" 10 seconds before a
 * change, "One minute left" in long parts, and the count for parts done a number of times.
 *
 * Only the instruction for a new segment may cut the voice off. Counting and the extras wait
 * their turn (they're skipped if the voice is still busy), and counted moves start counting only
 * after their get-ready moment, so the instruction is always heard in full.
 */
export function useSegmentVoice({
  timeline,
  index,
  elapsed,
  voice,
}: {
  timeline: Segment[];
  index: number;
  elapsed: number;
  voice: Pick<VoiceGuide, "say" | "sayIfQuiet"> & Partial<Pick<VoiceGuide, "cue">>;
}) {
  const seg = timeline[index];
  const next = timeline[index + 1];
  const latest = useRef({ say: voice.say, sayIfQuiet: voice.sayIfQuiet, cue: voice.cue, seg, prev: timeline[index - 1], next });
  useEffect(() => {
    latest.current = { say: voice.say, sayIfQuiet: voice.sayIfQuiet, cue: voice.cue, seg, prev: timeline[index - 1], next };
  });

  // A new segment.
  const first = useRef(true);
  useEffect(() => {
    const { say: speak, seg: s, prev } = latest.current;
    if (!s) return;
    speak(segmentIntro(s, prev));
    if (first.current) first.current = false;
    else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      latest.current.cue?.("chime");
    }
  }, [index]);

  // A heads-up before the change, and one minute left in long parts. Not for counted moves:
  // the counting already says how far along they are.
  const step = seg?.kind === "part" ? seg.step : undefined;
  const counted = step?.mode === "count";
  const remaining = seg ? seg.seconds - elapsed : 0;
  const heads =
    !seg || counted ? "" : seg.seconds >= 20 && remaining <= 10 && remaining > 0 ? `next-${index}` : seg.seconds >= 180 && remaining <= 60 && remaining > 50 ? `minute-${index}` : "";
  useEffect(() => {
    if (!heads) return;
    const { sayIfQuiet, next: n } = latest.current;
    if (heads.startsWith("minute")) sayIfQuiet("One minute left of this part.");
    else sayIfQuiet(headsUp(latest.current.seg, n));
  }, [heads]);

  // Counting the repeats out loud, after the get-ready moment. 0 = still getting ready.
  const counting = counted && seg && step.secondsPerRep ? elapsed - seg.leadIn : -1;
  const rep = counted && step.secondsPerRep && counting >= 0 ? Math.min(step.reps ?? 1, Math.floor(counting / step.secondsPerRep) + 1) : 0;
  useEffect(() => {
    if (rep < 1) return;
    const { sayIfQuiet, seg: s } = latest.current;
    const reps = s?.step?.reps ?? 0;
    sayIfQuiet(rep === reps ? `${rep}. Last one.` : String(rep));
  }, [rep, index]);

  /** Seconds left of the get-ready moment (counted moves), 0 once counting has started. */
  const getReady = counted && seg && counting < 0 ? Math.ceil(seg.leadIn - elapsed) : 0;
  return { rep, getReady, sectionName: seg ? SECTION_NAME[seg.section] : "" };
}
