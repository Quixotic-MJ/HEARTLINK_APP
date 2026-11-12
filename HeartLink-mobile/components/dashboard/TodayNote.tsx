import React from "react";
import { Linking, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
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
  /** The one step offered under the note; older backends leave it out. */
  action?: NoteAction | null;
  /** Older backends: true when an AI reworded the body. Since 2026-11-12 the note is never AI-written. */
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

/**
 * The dashboard's daily note: one line on what just changed in the score, and its step when there is one. It's worked
 * out by the app's own rules (2026-11-12: the AI part moved to Trends as the AI summary of a period). An
 * emergency-level reading or symptom gets a red card with Call 911. When hidden it collapses into one row.
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
  const emergency = action === "see_what_to_do";
  const headline = insight.title || insight.body;
  const detail = insight.title ? insight.body : null;

  const badge = (size: number) => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: emergency ? (isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2") : c.surfaceAlt,
        borderWidth: 1,
        borderColor: emergency ? (isDark ? "rgba(239, 68, 68, 0.3)" : "#FECACA") : c.hairline,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather name={emergency ? "alert-triangle" : noteIcon(insight.icon)} size={size / 2} color={emergency ? c.danger : c.charcoal} />
    </View>
  );

  return (
    <Animated.View
      layout={LinearTransition.duration(240).easing(CUBIC_OUT)}
      accessibilityLabel="Today's note"
      style={{
        borderWidth: 1,
        borderColor: emergency ? (isDark ? "rgba(239, 68, 68, 0.4)" : "#FECACA") : c.hairline,
        borderRadius: 16,
        paddingVertical: hidden ? 10 : 15,
        paddingHorizontal: 15,
        backgroundColor: emergency ? (isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2") : c.canvas,
        overflow: "hidden",
      }}
    >
      {hidden ? (
        <AnimatedButton
          onPress={onShow}
          accessibilityRole="button"
          accessibilityLabel="Show today's note"
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 32 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            {badge(28)}
            <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "500", color: c.ink }}>Today&apos;s note</Text>
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
                <Text style={{ fontSize: 12, fontWeight: "700", color: c.danger }}>Urgent alert</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Today&apos;s note</Text>
            )}
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

      {!hidden && (
        <Animated.View
          entering={FadeIn.duration(200).easing(CUBIC_OUT)}
          exiting={FadeOut.duration(140).easing(CUBIC_IN)}
          style={{ gap: 12, marginTop: 12 }}
        >
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
            {detail ? <Text style={{ fontSize: 14.5, lineHeight: 21, color: c.charcoal }}>{detail}</Text> : null}
          </View>

          {emergency ? (
            <View style={{ flexDirection: "row", gap: 10, paddingTop: 2 }}>
              <DsButton label={ACTION_LABEL.see_what_to_do} onPress={() => onAction("see_what_to_do")} style={{ flex: 1 }} />
              <DsButton label="Call 911" variant="secondary" block={false} onPress={() => Linking.openURL("tel:911").catch(() => { })} />
            </View>
          ) : action ? (
            <DsButton label={ACTION_LABEL[action]} variant="secondary" block={false} onPress={() => onAction(action)} />
          ) : null}
        </Animated.View>
      )}
    </Animated.View>
  );
}
