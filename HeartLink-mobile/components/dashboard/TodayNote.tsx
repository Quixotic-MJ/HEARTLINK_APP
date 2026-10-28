import React from "react";
import { Text, View } from "react-native";
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
 * The dashboard's daily note (the "insight"): what changed in the score and one step to take.
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
  const { c } = useDs();
  const action = actionFor(insight);
  const aiWritten = insight.ai_written ?? !insight.title;
  const badge = (size: number) => (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 4,
        backgroundColor: c.lavender,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather name={noteIcon(insight.icon)} size={size / 2} color={c.charcoal} />
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
          gap: 10,
          height: 52,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: c.hairline,
          borderRadius: 12,
          backgroundColor: c.canvas,
        }}
      >
        {badge(28)}
        <Text style={{ flex: 1, fontSize: 15, color: c.ink }}>{"Today's note"}</Text>
        <Text style={{ fontSize: 14, fontWeight: "500", color: c.link }}>Show</Text>
      </AnimatedButton>
    );
  }

  return (
    <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, padding: 16, gap: 12, backgroundColor: c.canvas }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {badge(32)}
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 16, fontWeight: "600", color: c.ink }}>
          {"Today's note"}
        </Text>
        <AnimatedButton
          onPress={onHide}
          accessibilityRole="button"
          accessibilityLabel="Hide today's note"
          style={{ height: 44, marginVertical: -12, marginRight: -8, paddingHorizontal: 8, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 14, color: c.slate }}>Hide</Text>
        </AnimatedButton>
      </View>

      <View style={{ gap: 2 }}>
        {insight.title ? (
          <Text style={{ fontSize: 15, lineHeight: 22, fontWeight: "600", color: c.ink }}>{insight.title}</Text>
        ) : null}
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>{insight.body}</Text>
      </View>

      {aiWritten ? (
        <Text style={{ fontSize: 12, lineHeight: 17, color: c.steel }}>
          {"Written by AI from what you've logged. It isn't medical advice."}
        </Text>
      ) : null}

      {action ? (
        <DsButton label={ACTION_LABEL[action]} variant={action === "see_what_to_do" ? "primary" : "secondary"} block={false} onPress={() => onAction(action)} style={{ alignSelf: "flex-start", height: 44 }} />
      ) : null}
    </View>
  );
}
