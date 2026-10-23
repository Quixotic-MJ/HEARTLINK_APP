import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView, Animated, Easing, Dimensions, PanResponder } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import { DsColors } from "../../constants/theme";
import { bandTag } from "./ScoreCard";

/** The score's parts as the backend stores them (hss_service.compute_lifestyle_composite_hss). */
type ScoreFactors = {
  base_score?: number;
  meal_points?: number;
  exercise_points?: number;
  sleep_points?: number;
  medication_points?: number;
  blood_sugar_points?: number;
  weight_gain_points?: number;
  symptom_points?: number;
  streak_points?: number;
  staleness_points?: number;
  /** Older name some records may still carry. */
  staleness_penalty?: number;
  total_lifestyle_adjustment?: number;
};

interface ScoreExplanationModalProps {
  visible: boolean;
  score: number;
  tierLabel: string;
  hasLoggedData: boolean;
  factors?: ScoreFactors | null;
  onClose: () => void;
  onNavigateToLogging: () => void;
}

// One short line per band; same advice as the earlier sheet, fewer words.
const FRAMING: Record<string, string> = {
  Stable: "Your heart is doing great. Keep up your daily habits.",
  Moderate: "Doing okay. Water, a short walk or some rest will help today.",
  "Elevated Risk": "Your heart is working harder today. Take a break, skip salty snacks and check your blood pressure.",
  Critical: "Your heart is under a lot of stress. Sit down, rest, and contact your doctor or family if you feel unwell.",
};

// Bands as in the dashboard's getScoreTheme: under 50, 50–59, 60–79, 80 and up.
const BANDS = [
  { from: 1, to: 49, tint: (c: DsColors) => c.rose, edge: (c: DsColors) => c.charcoal },
  { from: 50, to: 59, tint: (c: DsColors) => c.peach, edge: (c: DsColors) => c.warmText },
  { from: 60, to: 79, tint: (c: DsColors) => c.yellow, edge: (c: DsColors) => c.warmText },
  { from: 80, to: 100, tint: (c: DsColors) => c.sky, edge: (c: DsColors) => c.line },
];

const LIFESTYLE_CAP = 20;

function factorRows(f: ScoreFactors, c: DsColors) {
  const rows: { label: string; value: number | undefined; icon: keyof typeof Feather.glyphMap; tint: string }[] = [
    { label: "Meals: sodium, fat and fibre", value: f.meal_points, icon: "coffee", tint: c.peach },
    { label: "Movement", value: f.exercise_points, icon: "activity", tint: c.mint },
    { label: "Sleep, 7 to 9 hours", value: f.sleep_points, icon: "moon", tint: c.lavender },
    { label: "Medication taken", value: f.medication_points, icon: "check-square", tint: c.sky },
    { label: "Blood sugar", value: f.blood_sugar_points, icon: "droplet", tint: c.rose },
    { label: "Weight change", value: f.weight_gain_points, icon: "bar-chart-2", tint: c.sky },
    { label: "Symptoms", value: f.symptom_points, icon: "alert-circle", tint: c.rose },
    { label: "Logging streak", value: f.streak_points, icon: "zap", tint: c.lavender },
    { label: "Missing readings", value: f.staleness_points ?? f.staleness_penalty, icon: "clock", tint: c.surfaceAlt },
  ];
  return rows.filter((r): r is typeof r & { value: number } => typeof r.value === "number" && r.value !== 0);
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");

export function ScoreExplanationModal({
  visible,
  score,
  tierLabel,
  hasLoggedData,
  factors,
  onClose,
  onNavigateToLogging,
}: ScoreExplanationModalProps) {
  const { c } = useDs();
  const insets = useSafeAreaInsets();

  const [slideAnim] = useState(() => new Animated.Value(Dimensions.get("window").height));
  const [backdropAnim] = useState(() => new Animated.Value(0));

  const animateIn = useCallback(() => {
    slideAnim.setValue(Dimensions.get("window").height);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, stiffness: 300, damping: 30, mass: 0.9, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const animateOut = useCallback(
    (done?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, {
          toValue: Dimensions.get("window").height,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => done?.());
    },
    [slideAnim, backdropAnim]
  );

  // Dragging the top of the sheet down past 100px closes it; a shorter drag springs back.
  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_e, g) => slideAnim.setValue(Math.max(0, g.dy)),
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 100 || g.vy > 1.2) {
            Haptics.selectionAsync();
            animateOut(onClose);
          } else {
            Animated.spring(slideAnim, { toValue: 0, stiffness: 300, damping: 30, useNativeDriver: true }).start();
          }
        },
      }),
    [slideAnim, animateOut, onClose]
  );

  if (!visible) return null;

  const hasScore = hasLoggedData && score > 0;
  const tag = bandTag(tierLabel, hasScore, c);
  const close = () => animateOut(onClose);
  const logBloodPressure = () => animateOut(onNavigateToLogging);

  const rows = factors ? factorRows(factors, c) : [];
  const change = factors?.total_lifestyle_adjustment ?? rows.reduce((sum, r) => sum + r.value, 0);
  // Older records don't store the starting point; it is the score before today's change.
  const start = factors?.base_score ?? score - change;
  const capped = Math.abs(rows.reduce((sum, r) => sum + r.value, 0)) > LIFESTYLE_CAP;
  const needsCheck = tierLabel === "Elevated Risk" || tierLabel === "Critical";

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onShow={animateIn} onRequestClose={close}>
      <Animated.View style={{ flex: 1, backgroundColor: "rgba(10,21,48,0.45)", opacity: backdropAnim }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={close}
          accessibilityLabel="Close"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "90%",
          backgroundColor: c.canvas,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <View {...dragResponder.panHandlers} style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: c.hairlineStrong }} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: c.ink }}>
              How your score works
            </Text>
            <TouchableOpacity
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={{ width: 44, height: 44, marginRight: -10, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="x" size={20} color={c.slate} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 + insets.bottom, gap: 28 }}
        >
          {/* The score, its band and where it sits among the bands */}
          <View style={{ gap: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 48, lineHeight: 54, fontWeight: "700", color: hasScore ? c.ink : c.steel, fontVariant: ["tabular-nums"] }}>
                {hasScore ? score : "--"}
              </Text>
              {hasScore ? <Text style={{ fontSize: 15, color: c.slate, marginTop: 14 }}>out of 100</Text> : null}
              <View style={{ marginLeft: "auto", paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: tag.bg }}>
                <Text style={{ fontSize: 13, fontWeight: "500", color: tag.fg }}>{tag.text}</Text>
              </View>
            </View>

            {hasScore ? (
              <>
                <BandBar c={c} score={score} />
                {FRAMING[tierLabel] ? (
                  <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>{FRAMING[tierLabel]}</Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>
                  Log a blood pressure reading to get your first score.
                </Text>
                <DsButton label="Log blood pressure" onPress={logBloodPressure} />
              </>
            )}
          </View>

          {hasScore ? (
            <>
              <View style={{ height: 1, backgroundColor: c.hairlineSoft }} />

              <View style={{ gap: 12 }}>
                <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>
                  What moved your score today
                </Text>

                <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, overflow: "hidden" }}>
                  <View
                    accessible
                    accessibilityLabel={`Starting point: ${start}`}
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, backgroundColor: c.surface, gap: 12 }}
                  >
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: c.ink }}>Starting point</Text>
                    <Text style={{ fontSize: 17, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>{start}</Text>
                  </View>

                  {rows.length > 0 ? (
                    <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                      {rows.map((r, i) => (
                        <View
                          key={r.label}
                          accessible
                          accessibilityLabel={`${r.label}: ${r.value > 0 ? "plus" : "minus"} ${Math.abs(r.value)} points`}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            paddingVertical: 12,
                            borderBottomWidth: i < rows.length - 1 ? 1 : 0,
                            borderBottomColor: c.hairlineSoft,
                          }}
                        >
                          <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: r.tint, alignItems: "center", justifyContent: "center" }}>
                            <Feather name={r.icon} size={15} color={c.charcoal} />
                          </View>
                          <Text style={{ flex: 1, fontSize: 15, color: c.ink }}>{r.label}</Text>
                          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: r.value > 0 ? c.mint : c.peach }}>
                            <Text style={{ fontSize: 14, fontWeight: "600", color: r.value > 0 ? c.charcoal : c.warmText, fontVariant: ["tabular-nums"] }}>
                              {signed(r.value)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, lineHeight: 20, color: c.slate }}>
                      Nothing logged yet today.
                    </Text>
                  )}

                  {rows.length > 0 ? (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.hairline }}>
                    <Text style={{ fontSize: 15, color: c.charcoal }}>
                      {"Today's change"}
                      {capped ? <Text style={{ fontSize: 13, color: c.slate }}> (limited to 20 either way)</Text> : null}
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>{signed(change)}</Text>
                  </View>
                  ) : null}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingVertical: 14, paddingHorizontal: 16, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.hairline }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Your score today</Text>
                    <Text style={{ fontSize: 17, fontWeight: "700", color: c.ink, fontVariant: ["tabular-nums"] }}>{score}</Text>
                  </View>
                </View>

                {needsCheck ? (
                  <DsButton label="Log blood pressure" variant="secondary" block={false} onPress={logBloodPressure} style={{ alignSelf: "flex-start", height: 44 }} />
                ) : null}

                <Text style={{ fontSize: 13, lineHeight: 19, color: c.slate }}>
                  {"Your starting point comes from your latest blood pressure reading. Today's habits move it up to 20 points either way. It isn't a diagnosis."}
                </Text>
              </View>
            </>
          ) : null}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

/** The four bands side by side, a "You" marker above the score, and the band edges (50, 60, 80) below. */
function BandBar({ c, score }: { c: DsColors; score: number }) {
  const clamped = Math.min(100, Math.max(1, score));
  const current = BANDS.find((b) => clamped >= b.from && clamped <= b.to);
  const width = (b: (typeof BANDS)[number]) => b.to - b.from + 1;
  // Keep the marker inside the bar's ends so it never clips.
  const markerLeft = Math.min(94, Math.max(6, clamped));

  return (
    <View
      accessible
      accessibilityLabel={`Score bands: Critical under 50, Elevated risk 50 to 59, Moderate 60 to 79, Stable 80 and up. You are at ${score}.`}
      style={{ gap: 4 }}
    >
      <View style={{ height: 30 }}>
        <View style={{ position: "absolute", left: `${markerLeft}%`, width: 48, marginLeft: -24, alignItems: "center" }}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={{ fontSize: 12, fontWeight: "600", color: c.ink }}>
            You
          </Text>
          <Feather name="chevron-down" size={14} color={c.ink} style={{ marginTop: -2 }} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 3, height: 10 }}>
        {BANDS.map((b, i) => (
          <View
            key={b.from}
            style={{
              flex: width(b),
              backgroundColor: b.tint(c),
              borderTopLeftRadius: i === 0 ? 5 : 0,
              borderBottomLeftRadius: i === 0 ? 5 : 0,
              borderTopRightRadius: i === BANDS.length - 1 ? 5 : 0,
              borderBottomRightRadius: i === BANDS.length - 1 ? 5 : 0,
              borderWidth: b === current ? 1.5 : 0,
              borderColor: b.edge(c),
            }}
          />
        ))}
      </View>
      <View style={{ height: 18 }}>
        {[50, 60, 80].map((edge) => (
          <Text
            key={edge}
            maxFontSizeMultiplier={1.3}
            style={{ position: "absolute", left: `${edge}%`, width: 32, marginLeft: -16, textAlign: "center", fontSize: 12, color: c.slate }}
          >
            {edge}
          </Text>
        ))}
      </View>
    </View>
  );
}
