import React from "react";
import { Linking, Text, View } from "react-native";
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
  const { c } = useDs();
  const action = actionFor(insight);
  const aiWritten = insight.ai_written ?? !insight.title;
  const emergency = action === "see_what_to_do";
  const headline = insight.title || insight.body;
  // The second line only earns its place when there is something to do (or the AI wrote the note)
  const detail = insight.title && (action || aiWritten) ? insight.body : null;
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
    <View
      accessibilityLabel="Today's note"
      style={{
        borderWidth: 1,
        borderColor: emergency ? c.danger : c.hairline,
        borderRadius: 12,
        padding: 14,
        gap: 12,
        backgroundColor: emergency ? c.rose : c.surface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {emergency ? <Feather name="alert-triangle" size={20} color={c.danger} /> : badge(28)}
        <Text style={{ flex: 1, fontSize: 15, lineHeight: 21, fontWeight: emergency ? "600" : "500", color: c.ink }}>{headline}</Text>
        {emergency ? null : (
          <AnimatedButton
            onPress={onHide}
            accessibilityRole="button"
            accessibilityLabel="Hide today's note"
            style={{ height: 44, marginVertical: -12, marginRight: -6, paddingHorizontal: 6, justifyContent: "center" }}
          >
            <Text style={{ fontSize: 14, color: c.slate }}>Hide</Text>
          </AnimatedButton>
        )}
      </View>

      {detail ? <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal, marginTop: -4 }}>{detail}</Text> : null}

      {aiWritten ? (
        <Text style={{ fontSize: 12, lineHeight: 17, color: c.steel }}>
          {"Written by AI from what you've logged. It isn't medical advice."}
        </Text>
      ) : null}

      {emergency ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <DsButton label={ACTION_LABEL.see_what_to_do} onPress={() => onAction("see_what_to_do")} style={{ flex: 1 }} />
          <DsButton label="Call 911" variant="secondary" block={false} onPress={() => Linking.openURL("tel:911").catch(() => {})} />
        </View>
      ) : action ? (
        <DsButton label={ACTION_LABEL[action]} variant="secondary" block={false} onPress={() => onAction(action)} style={{ alignSelf: "flex-start", height: 44 }} />
      ) : null}
    </View>
  );
}
