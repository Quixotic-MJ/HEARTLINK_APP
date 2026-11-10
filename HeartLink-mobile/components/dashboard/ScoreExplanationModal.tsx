import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Modal, TouchableOpacity, ScrollView, Animated, Easing, Dimensions, Linking, PanResponder } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import { DsColors } from "../../constants/theme";
import { bandTag } from "./ScoreCard";
import { AHA_PAPER_URL, AREA_ROWS, areaDetail, HeartFactors, LAB_AREA_KEYS, ruleText } from "../../services/heartScore";

interface ScoreExplanationModalProps {
  visible: boolean;
  score: number;
  tierLabel: string;
  hasLoggedData: boolean;
  factors?: HeartFactors | null;
  onClose: () => void;
  onNavigateToLogging: () => void;
  /** HL-138: opens the optional lab results screen */
  onAddLabResults?: () => void;
}

// One short line per band; same advice as the earlier sheet, fewer words.
const FRAMING: Record<string, string> = {
  Stable: "Your readings and habits look steady. Keep it up.",
  Moderate: "Small changes in salt, sleep or movement can help.",
  "Elevated Risk": "Take it easy, skip salty snacks and check your blood pressure again later.",
  Critical: "Rest, and see a doctor soon. If you feel unwell, call 911.",
};

// Bands as in the dashboard's getScoreTheme: under 50, 50–59, 60–79, 80 and up.
const BANDS = [
  { from: 1, to: 49, tint: (c: DsColors) => c.rose, edge: (c: DsColors) => c.charcoal },
  { from: 50, to: 59, tint: (c: DsColors) => c.peach, edge: (c: DsColors) => c.warmText },
  { from: 60, to: 79, tint: (c: DsColors) => c.yellow, edge: (c: DsColors) => c.warmText },
  { from: 80, to: 100, tint: (c: DsColors) => c.sky, edge: (c: DsColors) => c.line },
];

export function ScoreExplanationModal({
  visible,
  score,
  tierLabel,
  hasLoggedData,
  factors,
  onClose,
  onNavigateToLogging,
  onAddLabResults,
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
  // HL-138: opens the optional lab results screen
  const addLabResults = () => animateOut(() => onAddLabResults?.());

  const areas = factors?.areas ?? null;
  const rule = ruleText(factors?.rule);
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
                  What&apos;s in your score
                </Text>

                {areas ? (
                  <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, overflow: "hidden" }}>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
                      {AREA_ROWS.map((row, i) => {
                        const area = areas[row.key];
                        const detail = area ? areaDetail(row.key, area) : row.missing;
                        return (
                          <View
                            key={row.key}
                            accessible
                            accessibilityLabel={`${row.label}: ${area ? `${area.points} points` : "not scored"}. ${detail}`}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                              paddingVertical: 12,
                              borderBottomWidth: i < AREA_ROWS.length - 1 ? 1 : 0,
                              borderBottomColor: c.hairlineSoft,
                            }}
                          >
                            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: c[row.tint], alignItems: "center", justifyContent: "center" }}>
                              <Feather name={row.icon} size={15} color={c.charcoal} />
                            </View>
                            <View style={{ flex: 1, gap: 1 }}>
                              <Text style={{ fontSize: 15, color: c.ink }}>{row.label}</Text>
                              <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate }}>{detail}</Text>
                            </View>
                            <Text style={{ fontSize: 17, fontWeight: "600", color: area ? c.ink : c.steel, fontVariant: ["tabular-nums"] }}>
                              {area ? area.points : "–"}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {typeof factors?.average === "number" ? (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: c.hairline }}>
                        <Text style={{ fontSize: 15, color: c.charcoal }}>{`Average of ${factors.areas_used} areas`}</Text>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>{factors.average}</Text>
                      </View>
                    ) : null}
                    {rule ? (
                      <Text style={{ paddingHorizontal: 16, paddingBottom: 12, fontSize: 14, lineHeight: 20, color: c.charcoal }}>{rule}</Text>
                    ) : null}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingVertical: 14, paddingHorizontal: 16, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.hairline }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Your score</Text>
                      <Text style={{ fontSize: 17, fontWeight: "700", color: c.ink, fontVariant: ["tabular-nums"] }}>{score}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>
                    {"This first score is an estimate from your setup answers. Once you log something, it's based on your blood pressure, activity, sleep, nicotine, body weight and diet."}
                  </Text>
                )}

                {onAddLabResults && !(areas && LAB_AREA_KEYS.every((k) => areas[k])) ? (
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 13, lineHeight: 19, color: c.slate }}>
                      {"Cholesterol and blood sugar need a blood test. If you've had one, you can add the results (optional)."}
                    </Text>
                    <DsButton label="Add lab results" variant="secondary" block={false} onPress={addLabResults} style={{ alignSelf: "flex-start", height: 44 }} />
                  </View>
                ) : null}

                {needsCheck ? (
                  <DsButton label="Log blood pressure" variant="secondary" block={false} onPress={logBloodPressure} style={{ alignSelf: "flex-start", height: 44 }} />
                ) : null}
              </View>

              <View style={{ height: 1, backgroundColor: c.hairlineSoft }} />

              <View style={{ gap: 10 }}>
                <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>
                  Where the points come from
                </Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>
                  {"The points for blood pressure, activity, sleep, nicotine, body weight, cholesterol and blood sugar come from the American Heart Association's Life's Essential 8. The diet points and the limits on your score are HeartLink's own, and they're waiting for expert review. Lab results are what you entered, not checked by HeartLink."}
                </Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>
                  {"Your first score, before any logs, is a machine learning model's estimate of a Life's Essential 8 score. It was trained on a US health survey of 3,703 adults (NHANES 2017-2018)."}
                </Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>
                  {"This isn't the official AHA score and it hasn't been validated. It's a wellness guide, not a diagnosis."}
                </Text>
                <Text
                  accessibilityRole="link"
                  onPress={() => Linking.openURL(AHA_PAPER_URL)}
                  style={{ fontSize: 14, lineHeight: 20, color: c.link, paddingVertical: 4 }}
                >
                  Read the AHA paper
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
      accessibilityLabel={`Score levels: Get checked under 50, Needs attention 50 to 59, Room to improve 60 to 79, On track 80 and up. You are at ${score}.`}
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
