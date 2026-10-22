import React, { useEffect, useLayoutEffect, useRef } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import Animated, { Easing, SharedValue, cancelAnimation, useAnimatedProps, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { ds } from "../../constants/theme";
import type { Routine } from "../../services/exerciseSession";
import type { VoiceGuide } from "../../hooks/useVoiceGuide";

// Small pieces shared by the exercise screens, on the design system.
// Movement uses the mint tint; "I feel unwell" and symptom states use the rose tint.
// While exercising (get ready and the "during" screens) the app switches to a navy workout
// view: large type, a thick ring that glides smoothly, and one big round button.

/** What every "during" screen gets from the session screen. */
export interface SessionScreenProps {
  routine: Routine;
  /** Seconds exercised so far, pauses left out. */
  elapsed: number;
  /** The same to the millisecond, for animations. */
  elapsedMs: number;
  paused: boolean;
  onTogglePause: () => void;
  onFinish: () => void;
  onClose: () => void;
  onUnwell: () => void;
  /** Spoken instructions; the screen says each new step. */
  voice: VoiceGuide;
}

/** Workout view colours: HeartLink navy with the dark theme's text and blue line (same in light and dark mode). */
export const WORKOUT = {
  bg: ds.light.navy,
  ink: ds.dark.ink,
  soft: ds.dark.slate,
  muted: ds.dark.steel,
  line: ds.dark.line,
  track: "rgba(242,241,238,0.16)",
  raised: "rgba(242,241,238,0.08)",
} as const;

// ─── Smooth progress ─────────────────────────────────────────────────────────

/**
 * A 0-to-1 value that glides on its own (on the UI thread) from `from` to 1 over the time left,
 * instead of jumping on every timer tick. It restarts when `resetKey` changes (a new step) or
 * when running stops and starts.
 */
export function useLinearProgress(from: number, totalMs: number, running: boolean, resetKey: string | number) {
  const p = useSharedValue(from);
  const latest = useRef({ from, totalMs });
  useLayoutEffect(() => {
    latest.current = { from, totalMs };
  });
  // Before the screen is drawn, so a new step never shows the last step's fill for a frame.
  useLayoutEffect(() => {
    const { from: f, totalMs: t } = latest.current;
    const start = Math.min(1, Math.max(0, f));
    cancelAnimation(p);
    p.value = start;
    if (running && t > 0 && start < 1) p.value = withTiming(1, { duration: (1 - start) * t, easing: Easing.linear });
  }, [running, resetKey, p]);
  return p;
}

/**
 * When the step changes: say it out loud and give a tap on the phone, so patients can follow
 * along without looking. The first step is said too (no tap, the countdown just tapped).
 */
export function useStepCue(stepKey: string | number, say: (text: string) => void, text: string) {
  const first = useRef(true);
  const latest = useRef({ say, text });
  useEffect(() => {
    latest.current = { say, text };
  });
  useEffect(() => {
    latest.current.say(latest.current.text);
    if (first.current) {
      first.current = false;
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [stepKey]);
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Thick ring that fills clockwise from a gliding progress value; anything in the middle. */
export function WorkoutRing({ size, stroke = 10, progress, children }: { size: number; stroke?: number; progress: SharedValue<number>; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const arc = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={WORKOUT.track} strokeWidth={stroke} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={WORKOUT.line}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${length} ${length}`}
          animatedProps={arc}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Seconds into the exercise, gliding on the animation thread (restarts when `resetKey` changes). */
export function useTimelineSeconds(elapsedMs: number, totalSeconds: number, running: boolean, resetKey: string | number) {
  const total = Math.max(1, totalSeconds);
  const p = useLinearProgress(elapsedMs / (total * 1000), total * 1000, running, resetKey);
  return useDerivedValue(() => p.value * total);
}

/**
 * Ring for the part being played. Which part, and how full, is worked out from the timeline on the
 * animation thread, so it switches to the next part exactly on time and never shows the last
 * part's fill for a moment. (No helper functions inside: the build would move them off that thread.)
 */
export function PartRing({ size, stroke = 10, t, starts, lengths, children }: { size: number; stroke?: number; t: SharedValue<number>; starts: number[]; lengths: number[]; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  const arc = useAnimatedProps(() => {
    const now = t.value;
    let f = 0;
    for (let i = starts.length - 1; i >= 0; i--) {
      if (now >= starts[i]) {
        f = Math.min(1, Math.max(0, (now - starts[i]) / Math.max(1, lengths[i])));
        break;
      }
    }
    return { strokeDashoffset: length * (1 - f) };
  });
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0 }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={WORKOUT.track} strokeWidth={stroke} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={WORKOUT.line}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${length} ${length}`}
          animatedProps={arc}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

function TimelineBarPart({ t, start, length }: { t: SharedValue<number>; start: number; length: number }) {
  const fill = useAnimatedStyle(() => ({ width: `${Math.min(1, Math.max(0, (t.value - start) / Math.max(1, length))) * 100}%` }));
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: WORKOUT.track, overflow: "hidden" }}>
      <Animated.View style={[{ height: 4, backgroundColor: WORKOUT.line }, fill]} />
    </View>
  );
}

/** One part per segment of the timeline; each fills from the timeline itself, so none ever jumps. */
export function TimelineBar({ t, starts, lengths, label }: { t: SharedValue<number>; starts: number[]; lengths: number[]; label: string }) {
  return (
    <View className="flex-row" style={{ gap: 4 }} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      {starts.map((start, i) => (
        <TimelineBarPart key={i} t={t} start={start} length={lengths[i]} />
      ))}
    </View>
  );
}

/** One part per step: done parts full, the current one filling smoothly. */
export function StepBar({ count, index, progress, label }: { count: number; index: number; progress: SharedValue<number>; label: string }) {
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View className="flex-row" style={{ gap: 4 }} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      {Array.from({ length: Math.max(1, count) }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: WORKOUT.track, overflow: "hidden" }}>
          {i < index ? <View style={{ height: 4, width: "100%", backgroundColor: WORKOUT.line }} /> : null}
          {i === index ? <Animated.View style={[{ height: 4, backgroundColor: WORKOUT.line }, fill]} /> : null}
        </View>
      ))}
    </View>
  );
}

/**
 * Big minutes:seconds; the digits keep their width so the clock doesn't wobble. Given `maxWidth`
 * (e.g. the inside of a ring) it shrinks to fit however many digits it's showing ("15:00" needs
 * more room than "0:45"). It ignores the phone's larger-text setting, being huge already, so it
 * can't spill out of its ring.
 */
export function BigClock({ seconds, size = 72, dim = false, label, maxWidth }: { seconds: number; size?: number; dim?: boolean; label?: string; maxWidth?: number }) {
  const s = Math.max(0, Math.floor(seconds));
  const minutes = String(Math.floor(s / 60));
  // A digit is about 0.62 of the font size wide; the colon about 0.4.
  const fit = maxWidth ? Math.floor(maxWidth / ((minutes.length + 2) * 0.62 + 0.4)) : size;
  const fontSize = Math.min(size, fit);
  const digit = {
    fontSize,
    lineHeight: Math.round(fontSize * 1.2),
    fontWeight: "600" as const,
    color: WORKOUT.ink,
    fontVariant: ["tabular-nums" as const],
    includeFontPadding: false,
  };
  return (
    <View
      className="flex-row items-center"
      style={{ opacity: dim ? 0.55 : 1 }}
      accessible
      accessibilityLabel={label ?? `${Math.floor(s / 60)} minutes ${s % 60} seconds`}
    >
      <Text style={digit} maxFontSizeMultiplier={1}>
        {minutes}
      </Text>
      <Text style={[digit, { marginTop: -fontSize * 0.08 }]} maxFontSizeMultiplier={1}>
        :
      </Text>
      <Text style={digit} maxFontSizeMultiplier={1}>
        {String(s % 60).padStart(2, "0")}
      </Text>
    </View>
  );
}

// ─── Workout view controls ───────────────────────────────────────────────────

function RoundButton({ icon, label, caption, onPress, big = false }: { icon: keyof typeof Feather.glyphMap; label: string; caption?: string; onPress: () => void; big?: boolean }) {
  const size = big ? 76 : 56;
  return (
    <View style={{ alignItems: "center", gap: 6, width: big ? 76 : 64 }}>
      <AnimatedButton
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: big ? WORKOUT.ink : WORKOUT.raised,
          borderWidth: big ? 0 : 1,
          borderColor: WORKOUT.track,
        }}
      >
        <Feather name={icon} size={big ? 30 : 22} color={big ? WORKOUT.bg : WORKOUT.ink} style={icon === "play" ? { marginLeft: 4 } : undefined} />
      </AnimatedButton>
      {caption ? <Text style={{ fontSize: 12, color: WORKOUT.soft }}>{caption}</Text> : null}
    </View>
  );
}

/**
 * The big round pause / resume button, with Back and Next on either side for exercises done
 * move by move. "Finish and save" shows while paused, so it can't be tapped by accident.
 */
export function SessionControls({
  paused,
  onTogglePause,
  onFinish,
  onPrev,
  onNext,
  nextIsFinish = false,
}: {
  paused: boolean;
  onTogglePause: () => void;
  onFinish: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  nextIsFinish?: boolean;
}) {
  const spacer = <View style={{ width: 64 }} />;
  return (
    <View style={{ gap: 14 }}>
      <View className="flex-row items-start justify-center" style={{ gap: 28 }}>
        {onPrev ? <RoundButton icon="chevron-left" label="Previous move" caption="Back" onPress={onPrev} /> : spacer}
        <RoundButton big icon={paused ? "play" : "pause"} label={paused ? "Resume" : "Pause"} onPress={onTogglePause} />
        {onNext ? (
          <RoundButton icon={nextIsFinish ? "check" : "chevron-right"} label={nextIsFinish ? "Finish" : "Next move"} caption={nextIsFinish ? "Finish" : "Next"} onPress={onNext} />
        ) : (
          spacer
        )}
      </View>
      {paused ? (
        <AnimatedButton
          onPress={onFinish}
          accessibilityRole="button"
          accessibilityLabel="Finish and save"
          style={{ height: 48, borderRadius: 8, borderWidth: 1, borderColor: WORKOUT.soft, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 15, fontWeight: "500", color: WORKOUT.ink }}>Finish and save</Text>
        </AnimatedButton>
      ) : null}
    </View>
  );
}

/** Close button, exercise name and a line under it, the voice on/off button; optional bar below. */
export function SessionTopBar({
  title,
  subtitle,
  onClose,
  voice,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  voice?: Pick<VoiceGuide, "muted" | "toggleMute">;
  children?: React.ReactNode;
}) {
  return (
    <View className="px-5 pt-3" style={{ gap: 14 }}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <AnimatedButton
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Stop the exercise"
          style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: WORKOUT.track, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="x" size={20} color={WORKOUT.ink} />
        </AnimatedButton>
        <View style={{ flex: 1, gap: 2 }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontSize: 17, fontWeight: "600", color: WORKOUT.ink }}>
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: WORKOUT.soft, fontVariant: ["tabular-nums"] }}>{subtitle}</Text>
        </View>
        {voice ? (
          <AnimatedButton
            onPress={voice.toggleMute}
            accessibilityRole="switch"
            accessibilityState={{ checked: !voice.muted }}
            accessibilityLabel="Spoken instructions"
            style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: WORKOUT.track, alignItems: "center", justifyContent: "center" }}
          >
            <Feather name={voice.muted ? "volume-x" : "volume-2"} size={20} color={voice.muted ? WORKOUT.muted : WORKOUT.ink} />
          </AnimatedButton>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** Always on screen during an exercise: light rose with dark text, on the navy workout view. */
export function UnwellButton({ onPress }: { onPress: () => void }) {
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="I feel unwell"
      accessibilityHint="Saves what you did and opens the symptom log"
      style={{ height: 48, borderRadius: 8, backgroundColor: ds.light.rose, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
    >
      <Feather name="alert-triangle" size={18} color={ds.light.danger} />
      <Text style={{ fontSize: 15, fontWeight: "500", color: ds.light.ink }}>I feel unwell</Text>
    </AnimatedButton>
  );
}

// ─── Light screens (details, history, list) ──────────────────────────────────

/** 44px outlined square with one icon: back, close. */
export function SquareIconButton({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  const { c } = useDs();
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas, alignItems: "center", justifyContent: "center" }}
    >
      <Feather name={icon} size={20} color={c.ink} />
    </AnimatedButton>
  );
}

type Tone = "sky" | "mint" | "neutral" | "rose";

export function Tag({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const { c } = useDs();
  const bg = { sky: c.tint, mint: c.mint, neutral: c.surfaceAlt, rose: c.rose }[tone];
  const fg = tone === "sky" ? c.onTint : tone === "rose" ? c.ink : c.charcoal;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" }}>
      <Text style={{ fontSize: 13, fontWeight: "500", color: fg }}>{label}</Text>
    </View>
  );
}

/** Square badge with an icon, for list rows. */
export function IconBadge({ icon, tone = "mint", size = 44 }: { icon: keyof typeof Feather.glyphMap; tone?: Tone; size?: number }) {
  const { c } = useDs();
  const bg = { sky: c.tint, mint: c.mint, neutral: c.surfaceAlt, rose: c.rose }[tone];
  const fg = tone === "rose" ? c.danger : tone === "sky" ? c.onTint : c.charcoal;
  return (
    <View style={{ width: size, height: size, borderRadius: 8, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Feather name={icon} size={20} color={fg} />
    </View>
  );
}

/** One continuous thin bar, 0 to 1. */
export function LineBar({ progress, label, height = 4 }: { progress: number; label: string; height?: number }) {
  const { c } = useDs();
  const p = Math.min(1, Math.max(0, progress));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={{ height, borderRadius: height / 2, backgroundColor: c.hairlineSoft, overflow: "hidden" }}>
      <View style={{ width: `${p * 100}%`, height, backgroundColor: c.line }} />
    </View>
  );
}

/** Bottom sheet with a title and a short line; the choices go inside. */
export function SheetModal({
  visible,
  onRequestClose,
  title,
  body,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  title: string;
  body?: string;
  children: React.ReactNode;
}) {
  const { c } = useDs();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15,15,15,0.55)" }}>
        <Pressable style={{ flex: 1 }} onPress={onRequestClose} accessibilityLabel="Close" accessibilityRole="button" />
        <View
          accessibilityViewIsModal
          style={{ backgroundColor: c.canvas, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 12, gap: 10 }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.hairlineStrong, alignSelf: "center", marginBottom: 8 }} />
          <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "600", color: c.ink }}>
            {title}
          </Text>
          {body ? <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate, marginBottom: 6 }}>{body}</Text> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** A full-width choice in a sheet: rose for feeling unwell, outlined otherwise. */
export function SheetOption({ title, hint, tone = "outline", onPress }: { title: string; hint?: string; tone?: "rose" | "outline"; onPress: () => void }) {
  const { c } = useDs();
  const rose = tone === "rose";
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${title}. ${hint}` : title}
      style={{
        minHeight: 56,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: rose ? c.rose : c.canvas,
        borderWidth: rose ? 0 : 1,
        borderColor: c.hairlineStrong,
      }}
    >
      {rose ? <Feather name="alert-triangle" size={20} color={c.danger} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink }}>{title}</Text>
        {hint ? <Text style={{ fontSize: 13, color: rose ? c.charcoal : c.slate }}>{hint}</Text> : null}
      </View>
    </AnimatedButton>
  );
}

/** The way into exercise history (every activity and guided exercise logged), from the Movement sheet and the Exercises tab. */
export function ExerciseHistoryLink({ onPress }: { onPress: () => void }) {
  const { c } = useDs();
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel="Your exercise history. Every activity and guided exercise you've logged"
      style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.mint }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: c.canvas, alignItems: "center", justifyContent: "center" }}>
        <Feather name="clock" size={18} color={c.charcoal} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Your exercise history</Text>
        <Text style={{ fontSize: 13, color: c.charcoal }}>{"Every activity and guided exercise you've logged"}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={c.charcoal} />
    </AnimatedButton>
  );
}
