import React from "react";
import { Linking, Text, View, TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";

export type NoteAction = "log_vitals" | "review_meals" | "see_what_to_do" | "log_later";

export type Insight = {
  title?: string;
  body: string;
  icon?: string;
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
};

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
 * The dashboard's daily note (the "insight"): one line on what changed in the score; its explanation and step
 * only when there is a step to take. An emergency-level reading or symptom gets a red card with Call 911.
 * When hidden it shrinks to a single row that brings it back.
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
  const headline = insight.title || insight.body;
  // The second line only earns its place when there is something to do (or the AI wrote the note)
  const detail = insight.title && (action || aiWritten) ? insight.body : null;

  const badgeIconName = emergency
    ? "alert-triangle"
    : aiWritten
    ? "zap"
    : noteIcon(insight.icon);

  const badge = (size: number) => (
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

  if (hidden) {
    return (
      <AnimatedButton
        onPress={onShow}
        accessibilityRole="button"
        accessibilityLabel="Show today's note"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          height: 52,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: aiWritten
            ? isDark ? "rgba(59, 130, 246, 0.25)" : "#BFDBFE"
            : c.hairline,
          borderRadius: 14,
          backgroundColor: aiWritten
            ? isDark ? "rgba(15, 23, 42, 0.7)" : "#F0F7FF"
            : c.canvas,
        }}
      >
        {badge(28)}
        <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "500", color: c.ink }}>
          {aiWritten ? "AI Health Coach Note" : "Today's note"}
        </Text>
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
    );
  }

  return (
    <View
      accessibilityLabel="Today's note"
      style={{
        borderWidth: 1,
        borderColor: emergency
          ? isDark ? "rgba(239, 68, 68, 0.4)" : "#FECACA"
          : aiWritten
          ? isDark ? "rgba(59, 130, 246, 0.25)" : "#BFDBFE"
          : c.hairline,
        borderRadius: 16,
        padding: 16,
        gap: 12,
        backgroundColor: emergency
          ? isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2"
          : aiWritten
          ? isDark ? "rgba(15, 23, 42, 0.65)" : "#F0F7FF"
          : c.canvas,
      }}
    >
      {/* Top Header Row with AI Coach / Category Tag and Hide button */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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

      {/* Main Headline & Message Detail */}
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
      </View>

      {/* Action Step CTA */}
      {emergency ? (
        <View style={{ flexDirection: "row", gap: 10, paddingTop: 2 }}>
          <DsButton label={ACTION_LABEL.see_what_to_do} onPress={() => onAction("see_what_to_do")} style={{ flex: 1 }} />
          <DsButton label="Call 911" variant="secondary" block={false} onPress={() => Linking.openURL("tel:911").catch(() => {})} />
        </View>
      ) : action ? (
        <TouchableOpacity
          onPress={() => onAction(action)}
          accessibilityRole="button"
          accessibilityLabel={ACTION_LABEL[action]}
          activeOpacity={0.85}
          style={{
            alignSelf: "flex-start",
            height: 40,
            borderRadius: 10,
            backgroundColor: c.primary,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            gap: 6,
            shadowColor: c.primary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          <Text style={{ fontSize: 13.5, fontWeight: "600", color: c.onPrimary }}>
            {ACTION_LABEL[action]}
          </Text>
          <Feather name="arrow-right" size={14} color={c.onPrimary} />
        </TouchableOpacity>
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
    </View>
  );
}
