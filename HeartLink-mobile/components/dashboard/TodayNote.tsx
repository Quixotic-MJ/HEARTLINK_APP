import React, { useEffect } from "react";
import { Linking, Text, View, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";

export type NoteAction =
  | "log_vitals"
  | "review_meals"
  | "see_what_to_do"
  | "log_later"
  | "log_meal"
  | "log_sleep"
  | "low_sodium_ideas"
  | "start_walk";

export type Insight = {
  title?: string;
  body: string;
  icon?: string;
  /** Small print: habit points the check-in itself added, and yesterday's habit points resetting at midnight. */
  side_note?: string | null;
  /** The one step offered under the note; older backends leave it out. */
  action?: NoteAction | null;
  /** True when the AI coach wrote the body. */
  ai_written?: boolean;
};

const ACTION_LABEL: Record<NoteAction, string> = {
  log_vitals: "Log today's vitals",
  review_meals: "Review today's meals",
  see_what_to_do: "See what to do",
  log_later: "Log a reading",
  log_meal: "Log a meal",
  log_sleep: "Log sleep",
  low_sodium_ideas: "Low sodium ideas",
  start_walk: "Start a walk",
};

// Monotonic cubic easing curves — smooth and zero bounce
const CUBIC_OUT = Easing.out(Easing.cubic);
const CUBIC_IN = Easing.in(Easing.cubic);
const CUBIC_IN_OUT = Easing.inOut(Easing.cubic);

// Older dashboards sent no action, so it is guessed from the icon the rules chose.
function actionFor(insight: Insight): NoteAction | null {
  if (insight.action !== undefined) return insight.action;
  if (insight.icon === "info" || insight.icon === "alert-circle") return "log_vitals";
  if (insight.icon === "trending-down") return "review_meals";
  return null;
}

function noteIcon(icon?: string): keyof typeof Feather.glyphMap {
  return icon && icon in Feather.glyphMap ? (icon as keyof typeof Feather.glyphMap) : "info";
}

/** Parses an un-titled AI note body into a punchy key takeaway and supporting advice. */
function parseAiInsight(body: string): {
  highlight: string;
  supporting: string | null;
} {
  const trimmed = body.trim();
  // Split on first sentence boundary (. ! ?)
  const match = trimmed.match(/^([^.!?]+[.!?])\s+([\s\S]+)$/);
  if (match && match[1].length < 160) {
    return {
      highlight: match[1].trim(),
      supporting: match[2].trim(),
    };
  }
  return {
    highlight: trimmed,
    supporting: null,
  };
}

/** Sentiment/trend tone for the key insight card */
function getTakeawayTone(text: string): {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  badgeBg: string;
} {
  const lower = text.toLowerCase();
  if (
    lower.includes("boost") ||
    lower.includes("steady") ||
    lower.includes("great") ||
    lower.includes("wonderful") ||
    lower.includes("positive") ||
    lower.includes("improving") ||
    lower.includes("healthy") ||
    lower.includes("good")
  ) {
    return {
      icon: "trending-up",
      iconColor: "#059669",
      badgeBg: "#ECFDF5",
    };
  }
  if (
    lower.includes("warning") ||
    lower.includes("high") ||
    lower.includes("alert") ||
    lower.includes("caution") ||
    lower.includes("limit") ||
    lower.includes("careful")
  ) {
    return {
      icon: "alert-circle",
      iconColor: "#D97706",
      badgeBg: "#FEF3C7",
    };
  }
  return {
    icon: "zap",
    iconColor: "#2563EB",
    badgeBg: "#EFF6FF",
  };
}

/**
 * The dashboard's daily note (the "insight"): one line on what changed in the score; its explanation and step
 * only when there is a step to take. An emergency-level reading or symptom gets a red card with Call 911.
 * When hidden it collapses smoothly into a single row that brings it back.
 */
export function TodayNote({
  insight,
  hidden,
  onHide,
  onShow,
  onAction,
}: {
  insight: Insight;
  hidden: boolean;
  onHide: () => void;
  onShow: () => void;
  onAction: (action: NoteAction) => void;
}) {
  const { c, isDark } = useDs();
  const action = actionFor(insight);
  const aiWritten = insight.ai_written ?? !insight.title;
  const emergency = action === "see_what_to_do";

  // Gentle, smooth ambient breathing on the AI Coach badge (scale 1 -> 1.06, zero bounce)
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    if (aiWritten && !emergency) {
      pulseScale.value = withRepeat(
        withTiming(1.06, { duration: 1600, easing: CUBIC_IN_OUT }),
        -1,
        true
      );
    } else {
      pulseScale.value = 1;
    }
  }, [aiWritten, emergency, pulseScale]);

  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  // When a structured title is provided (rules-based or alert)
  const hasExplicitTitle = Boolean(insight.title);
  const headline = insight.title || insight.body;
  const detail = insight.title ? insight.body : null;

  // When purely AI generated without title, format into scannable takeaway + coach advice
  const aiParsed = !hasExplicitTitle && aiWritten ? parseAiInsight(insight.body) : null;
  const tone = aiParsed ? getTakeawayTone(aiParsed.highlight) : null;

  const badgeIconName = emergency
    ? "alert-triangle"
    : aiWritten
      ? "zap"
      : noteIcon(insight.icon);

  const badge = (size: number) => {
    const badgeContent = (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 3,
          backgroundColor: emergency
            ? isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2"
            : aiWritten
              ? isDark ? "rgba(59, 130, 246, 0.2)" : "#DBEAFE"
              : c.surfaceAlt,
          borderWidth: 1,
          borderColor: emergency
            ? isDark ? "rgba(239, 68, 68, 0.3)" : "#FECACA"
            : aiWritten
              ? isDark ? "rgba(59, 130, 246, 0.3)" : "#BFDBFE"
              : c.hairline,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather
          name={badgeIconName}
          size={size / 2}
          color={emergency ? c.danger : aiWritten ? c.primary : c.charcoal}
        />
      </View>
    );

    if (aiWritten && !emergency) {
      return (
        <Animated.View style={animatedBadgeStyle}>
          {badgeContent}
        </Animated.View>
      );
    }
    return badgeContent;
  };

  return (
    <Animated.View
      layout={LinearTransition.duration(240).easing(CUBIC_OUT)}
      accessibilityLabel="Today's note"
      style={{
        borderWidth: 1,
        borderColor: emergency
          ? isDark ? "rgba(239, 68, 68, 0.4)" : "#FECACA"
          : aiWritten
            ? isDark ? "rgba(59, 130, 246, 0.25)" : "#BFDBFE"
            : c.hairline,
        borderRadius: 16,
        paddingVertical: hidden ? 10 : 15,
        paddingHorizontal: 15,
        backgroundColor: emergency
          ? isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2"
          : aiWritten
            ? isDark ? "rgba(15, 23, 42, 0.65)" : "#F0F7FF"
            : c.canvas,
        overflow: "hidden",
      }}
    >
      {/* Header Row: Always in place, seamlessly transitions between collapsed and expanded states */}
      {hidden ? (
        <AnimatedButton
          onPress={onShow}
          accessibilityRole="button"
          accessibilityLabel="Show today's note"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            minHeight: 32,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            {badge(28)}
            <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "500", color: c.ink }}>
              {aiWritten ? "AI Health Coach Note" : "Today's note"}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: isDark ? c.surfaceAlt : "#FFFFFF",
              borderWidth: 1,
              borderColor: c.hairline,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.primary }}>Show</Text>
          </View>
        </AnimatedButton>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 32 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {badge(30)}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {emergency ? (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2.5,
                    borderRadius: 999,
                    backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "#FECACA",
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: "700", color: c.danger, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Urgent Alert
                  </Text>
                </View>
              ) : aiWritten ? (
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2.5,
                    borderRadius: 999,
                    backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#DBEAFE",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(59, 130, 246, 0.3)" : "#BFDBFE",
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: "700", color: c.primary, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    AI Coach
                  </Text>
                </View>
              ) : null}
              <Text style={{ fontSize: 12, fontWeight: "500", color: c.slate }}>
                {emergency ? "Immediate Action" : aiWritten ? "Personalized Analysis" : "Today's Note"}
              </Text>
            </View>
          </View>

          {emergency ? null : (
            <AnimatedButton
              onPress={onHide}
              accessibilityRole="button"
              accessibilityLabel="Hide today's note"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: isDark ? c.surfaceAlt : "#FFFFFF",
                borderWidth: 1,
                borderColor: c.hairline,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "500", color: c.slate }}>Hide</Text>
            </AnimatedButton>
          )}
        </View>
      )}

      {/* Collapsible Content Area: Pure opacity fade without vertical collision or height jumps */}
      {!hidden && (
        <Animated.View
          entering={FadeIn.duration(200).easing(CUBIC_OUT)}
          exiting={FadeOut.duration(140).easing(CUBIC_IN)}
          style={{ gap: 12, marginTop: 12 }}
        >
          {/* Content Layout */}
          {hasExplicitTitle || emergency || !aiParsed ? (
            /* Standard / Rules-based layout */
            <View style={{ gap: 6 }}>
              <Text
                style={{
                  fontSize: 16,
                  lineHeight: 22,
                  fontWeight: "600",
                  color: emergency ? (isDark ? "#F87171" : "#991B1B") : c.ink,
                  letterSpacing: -0.2,
                }}
              >
                {headline}
              </Text>
              {detail ? (
                <Text style={{ fontSize: 14.5, lineHeight: 21, color: c.charcoal }}>
                  {detail}
                </Text>
              ) : null}
              {insight.side_note && !emergency ? (
                <Text style={{ fontSize: 12.5, lineHeight: 17, color: c.steel }}>{insight.side_note}</Text>
              ) : null}
            </View>
          ) : (
            /* Scannable AI Coach layout with Key Takeaway card and Coach advice */
            <View style={{ gap: 10 }}>
              {/* Key Insight Takeaway Card */}
              <View
                style={{
                  backgroundColor: isDark ? c.surfaceAlt : "#FFFFFF",
                  borderRadius: 14,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: isDark ? c.hairline : "#DBEAFE",
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                  ...Platform.select({
                    ios: {
                      shadowColor: "#0F172A",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 3,
                    },
                    android: { elevation: 1 },
                  }),
                }}
              >
                {tone ? (
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      backgroundColor: tone.badgeBg,
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    <Feather name={tone.icon} size={15} color={tone.iconColor} />
                  </View>
                ) : null}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      color: tone?.iconColor ?? c.primary,
                    }}
                  >
                    Key Insight
                  </Text>
                  <Text
                    style={{
                      fontSize: 14.5,
                      lineHeight: 20.5,
                      fontWeight: "600",
                      color: c.ink,
                      letterSpacing: -0.1,
                    }}
                  >
                    {aiParsed.highlight}
                  </Text>
                </View>
              </View>

              {/* Coach Advice / Encouragement */}
              {aiParsed.supporting ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 9,
                    paddingHorizontal: 4,
                    paddingVertical: 2,
                  }}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      backgroundColor: isDark ? "rgba(59, 130, 246, 0.15)" : "#EFF6FF",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    <Feather name="message-circle" size={13} color={c.primary} />
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontSize: 13.5,
                      lineHeight: 19.5,
                      color: c.charcoal,
                      fontWeight: "400",
                    }}
                  >
                    {aiParsed.supporting}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Action Step CTA */}
          {emergency ? (
            <View style={{ flexDirection: "row", gap: 10, paddingTop: 2 }}>
              <DsButton label={ACTION_LABEL.see_what_to_do} onPress={() => onAction("see_what_to_do")} style={{ flex: 1 }} />
              <DsButton label="Call 911" variant="secondary" block={false} onPress={() => Linking.openURL("tel:911").catch(() => { })} />
            </View>
          ) : action ? (
            <AnimatedButton
              onPress={() => onAction(action)}
              accessibilityRole="button"
              accessibilityLabel={ACTION_LABEL[action]}
              style={{
                alignSelf: "flex-start",
                height: 40,
                borderRadius: 10,
                backgroundColor: c.primary,
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                gap: 6,
                ...Platform.select({
                  ios: {
                    shadowColor: c.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.18,
                    shadowRadius: 3,
                  },
                  android: { elevation: 2 },
                }),
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: "600", color: c.onPrimary }}>
                {ACTION_LABEL[action]}
              </Text>
              <Feather name="arrow-right" size={14} color={c.onPrimary} />
            </AnimatedButton>
          ) : null}

          {/* AI Trust Footnote */}
          {aiWritten ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: isDark ? c.hairline : "#DBEAFE",
              }}
            >
              <Feather name="info" size={12} color={c.primary} />
              <Text style={{ fontSize: 11.5, color: c.slate }}>
                {"Written by AI from what you've logged. It isn't medical advice."}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      )}
    </Animated.View>
  );
}
