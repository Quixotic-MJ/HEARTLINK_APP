import React, { useEffect, useRef, useState } from "react";
import { StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "./useDs";

export interface ChoiceOption {
  value: string;
  label: string;
  desc?: string;
}

// Taps give one light haptic from AnimatedButton on press-in, so the controls don't add another.

// ─── Shared selection animation ──────────────────────────────────────────────

const SELECT_MS = 160;

/** 0 → 1 as an option becomes selected (eases the colour change instead of snapping). */
function useSelection(on: boolean) {
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.value = withTiming(on ? 1 : 0, { duration: SELECT_MS });
  }, [on, p]);
  return p;
}

/** Card-like option: background goes canvas → tint, border hairline → line. */
function useCardStyle(on: boolean, hasError = false) {
  const { c } = useDs();
  const p = useSelection(on);
  const offBorder = hasError ? c.danger : c.hairline;
  return useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [c.canvas, c.tint]),
    borderColor: interpolateColor(p.value, [0, 1], [offBorder, c.line]),
  }));
}

/** Round radio: ring turns blue and the dot springs in. */
function Radio({ on }: { on: boolean }) {
  const { c } = useDs();
  const p = useSelection(on);
  const dot = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    dot.value = on ? withSpring(1, { damping: 14, stiffness: 260 }) : withTiming(0, { duration: 120 });
  }, [on, dot]);
  const ring = useAnimatedStyle(() => ({
    borderColor: interpolateColor(p.value, [0, 1], [c.hairlineStrong, c.line]),
  }));
  const inner = useAnimatedStyle(() => ({ transform: [{ scale: dot.value }] }));
  return (
    <Animated.View style={[{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" }, ring]}>
      <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.line }, inner]} />
    </Animated.View>
  );
}

/** Square checkbox: fills blue and the tick pops in. */
function Checkbox({ on }: { on: boolean }) {
  const { c } = useDs();
  const p = useSelection(on);
  const tick = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    tick.value = on ? withSpring(1, { damping: 12, stiffness: 280 }) : withTiming(0, { duration: 100 });
  }, [on, tick]);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [c.canvas, c.line]),
    borderColor: interpolateColor(p.value, [0, 1], [c.hairlineStrong, c.line]),
  }));
  const icon = useAnimatedStyle(() => ({ transform: [{ scale: tick.value }] }));
  return (
    <Animated.View style={[{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" }, box]}>
      <Animated.View style={icon}>
        <Feather name="check" size={14} color="#ffffff" />
      </Animated.View>
    </Animated.View>
  );
}

// ─── Single choice: full-width rows with a radio ─────────────────────────────

function ChoiceRow({ opt, on, hasError, onPick }: { opt: ChoiceOption; on: boolean; hasError: boolean; onPick: () => void }) {
  const { c } = useDs();
  const anim = useCardStyle(on, hasError);
  const base: StyleProp<ViewStyle> = {
    minHeight: opt.desc ? 64 : 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  };
  return (
    <AnimatedButton
      onPress={onPick}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={opt.desc ? `${opt.label}. ${opt.desc}` : opt.label}
      style={[base, anim]}
    >
      <View className="flex-1">
        <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink }}>{opt.label}</Text>
        {opt.desc ? <Text style={{ fontSize: 13, color: c.slate, marginTop: 2 }}>{opt.desc}</Text> : null}
      </View>
      <Radio on={on} />
    </AnimatedButton>
  );
}

export function ChoiceList({
  options,
  value,
  onChange,
  accessibilityLabel,
  hasError = false,
}: {
  options: ChoiceOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  hasError?: boolean;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={{ gap: 8 }}>
      {options.map((opt) => (
        <ChoiceRow key={opt.value} opt={opt} on={value === opt.value} hasError={hasError} onPick={() => onChange(opt.value)} />
      ))}
    </View>
  );
}

// ─── Multi choice: rows with a checkbox (health goals) ───────────────────────

function CheckRow({ opt, on, onToggle }: { opt: ChoiceOption; on: boolean; onToggle: () => void }) {
  const { c } = useDs();
  const anim = useCardStyle(on);
  return (
    <AnimatedButton
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={opt.desc ? `${opt.label}. ${opt.desc}` : opt.label}
      style={[
        { minHeight: 68, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, flexDirection: "row", alignItems: "center", gap: 14 },
        anim,
      ]}
    >
      <View className="flex-1">
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{opt.label}</Text>
        {opt.desc ? <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate, marginTop: 2 }}>{opt.desc}</Text> : null}
      </View>
      <Checkbox on={on} />
    </AnimatedButton>
  );
}

export function CheckList({
  options,
  selected,
  onToggle,
  accessibilityLabel,
}: {
  options: ChoiceOption[];
  selected: string[];
  onToggle: (value: string) => void;
  accessibilityLabel: string;
}) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={{ gap: 10 }}>
      {options.map((opt) => (
        <CheckRow key={opt.value} opt={opt} on={selected.includes(opt.value)} onToggle={() => onToggle(opt.value)} />
      ))}
    </View>
  );
}

// ─── Big tiles for short numeric choices (fruit & veg servings) ──────────────

function Tile({ opt, on, caption, onPick }: { opt: ChoiceOption; on: boolean; caption?: string; onPick: () => void }) {
  const { c } = useDs();
  const anim = useCardStyle(on);
  return (
    <AnimatedButton
      onPress={onPick}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={caption ? `${opt.label} ${caption}` : opt.label}
      style={[
        { flexBasis: "47%", flexGrow: 1, height: 72, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
        anim,
      ]}
    >
      <Text style={{ fontSize: 22, fontWeight: "600", color: c.ink }}>{opt.label}</Text>
      {caption ? <Text style={{ fontSize: 12, color: c.steel }}>{caption}</Text> : null}
    </AnimatedButton>
  );
}

export function ChoiceTiles({
  options,
  value,
  onChange,
  accessibilityLabel,
  caption,
}: {
  options: ChoiceOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  caption?: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} className="flex-row flex-wrap" style={{ gap: 10 }}>
      {options.map((opt) => (
        <Tile key={opt.value} opt={opt} on={value === opt.value} caption={caption} onPick={() => onChange(opt.value)} />
      ))}
    </View>
  );
}

// ─── Yes / No pair ───────────────────────────────────────────────────────────

function YesNoButton({ label, on, onPick }: { label: string; on: boolean; onPick: () => void }) {
  const { c } = useDs();
  const anim = useCardStyle(on);
  return (
    <AnimatedButton
      onPress={onPick}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={[{ flex: 1, height: 56, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" }, anim]}
    >
      <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink }}>{label}</Text>
    </AnimatedButton>
  );
}

export function YesNo({
  value,
  onChange,
  accessibilityLabel,
}: {
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} className="flex-row" style={{ gap: 10 }}>
      <YesNoButton label="Yes" on={value === true} onPick={() => onChange(true)} />
      <YesNoButton label="No" on={value === false} onPick={() => onChange(false)} />
    </View>
  );
}

// ─── Stepper rows (days a week, minutes) ─────────────────────────────────────

export interface StepperRow {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

/** The number gently pops each time it changes. */
function StepValue({ label, value }: { label: string; value: number }) {
  const { c } = useDs();
  const scale = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scale.value = 1.18;
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  }, [value, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.Text style={[{ width: 52, textAlign: "center", fontSize: 18, fontWeight: "600", color: c.ink }, style]} accessibilityLabel={`${label}: ${value}`}>
      {value}
    </Animated.Text>
  );
}

export function StepperCard({ rows }: { rows: StepperRow[] }) {
  const { c } = useDs();
  const btn = {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.hairlineStrong,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: c.canvas,
  };
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, paddingHorizontal: 16, paddingVertical: 4 }}
    >
      {rows.map((r, i) => (
        <View key={r.label} className="flex-row items-center" style={{ minHeight: 60, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.hairlineSoft }}>
          <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: c.ink }}>{r.label}</Text>
          <AnimatedButton
            onPress={() => r.onChange(Math.max(r.min, r.value - r.step))}
            disabled={r.value <= r.min}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${r.label.toLowerCase()}`}
            style={[btn, { opacity: r.value <= r.min ? 0.4 : 1 }]}
          >
            <Feather name="minus" size={18} color={c.ink} />
          </AnimatedButton>
          <StepValue label={r.label} value={r.value} />
          <AnimatedButton
            onPress={() => r.onChange(Math.min(r.max, r.value + r.step))}
            disabled={r.value >= r.max}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${r.label.toLowerCase()}`}
            style={[btn, { opacity: r.value >= r.max ? 0.4 : 1 }]}
          >
            <Feather name="plus" size={18} color={c.ink} />
          </AnimatedButton>
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Chips (multi-select) ────────────────────────────────────────────────────

function Chip({ opt, on, onToggle }: { opt: ChoiceOption; on: boolean; onToggle: () => void }) {
  const { c, isDark } = useDs();
  const activeBg = isDark ? c.ink : "#000000";
  const p = useSelection(on);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [c.canvas, activeBg]),
    borderColor: interpolateColor(p.value, [0, 1], [c.hairline, activeBg]),
  }));
  return (
    <AnimatedButton
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={opt.label}
      style={[{ minHeight: 44, paddingHorizontal: 18, borderRadius: 9999, justifyContent: "center", borderWidth: 1 }, box]}
    >
      <Text style={{ fontSize: 14, fontWeight: "500", color: on ? c.canvas : c.charcoal }}>{opt.label}</Text>
    </AnimatedButton>
  );
}

export function ChipGroup({
  options,
  selected,
  onToggle,
  accessibilityLabel,
}: {
  options: ChoiceOption[];
  selected: string[];
  onToggle: (value: string) => void;
  accessibilityLabel: string;
}) {
  return (
    <View accessibilityLabel={accessibilityLabel} className="flex-row flex-wrap" style={{ gap: 8 }}>
      {options.map((opt) => (
        <Chip key={opt.value} opt={opt} on={selected.includes(opt.value)} onToggle={() => onToggle(opt.value)} />
      ))}
    </View>
  );
}

// ─── Text input with a focus border ──────────────────────────────────────────

interface DsTextFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  optional?: boolean;
  unit?: string;
  hasError?: boolean;
  large?: boolean;
  /** To move focus here from another field. */
  inputRef?: React.Ref<TextInput>;
  /** When a heading above already names the field (screen readers still hear the label). */
  hideLabel?: boolean;
}

export function DsTextField({ label, optional, unit, hasError = false, large = false, inputRef, hideLabel = false, ...input }: DsTextFieldProps) {
  const { c } = useDs();
  const [focused, setFocused] = useState(false);
  const p = useSelection(focused || hasError);
  const target = hasError ? c.danger : c.line;
  const box = useAnimatedStyle(() => ({
    borderColor: interpolateColor(p.value, [0, 1], [c.hairlineStrong, target]),
  }));
  return (
    <View style={{ gap: 6 }}>
      {hideLabel ? null : (
        <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>
          {label}
          {optional ? <Text style={{ fontWeight: "400", color: c.steel }}> (optional)</Text> : null}
        </Text>
      )}
      <Animated.View
        className="flex-row items-center"
        style={[{ height: large ? 64 : 52, borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 16, backgroundColor: c.canvas }, box]}
      >
        <TextInput
          {...input}
          ref={inputRef}
          accessibilityLabel={label}
          placeholderTextColor={c.steel}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={{ flex: 1, fontSize: large ? 26 : 17, fontWeight: large ? "600" : "400", color: c.ink, paddingVertical: 0 }}
        />
        {unit ? <Text style={{ fontSize: 14, fontWeight: "500", color: c.steel, marginLeft: 6 }}>{unit}</Text> : null}
      </Animated.View>
    </View>
  );
}
