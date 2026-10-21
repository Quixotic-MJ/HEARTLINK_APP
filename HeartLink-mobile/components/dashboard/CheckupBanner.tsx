import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";

export type CheckupReminder = {
  urgency: "within_2_weeks" | "asap";
  title: string;
  message: string;
  review_completed_at?: string;
};

/**
 * HL-057: shown for two weeks after a clinician's review asks for an in-person checkup. The backend only
 * sends it while PATIENT_REVIEW_FEEDBACK_ENABLED is on; the wording comes from the backend.
 */
export function CheckupBanner({
  reminder,
  onFindClinic,
  onHide,
}: {
  reminder: CheckupReminder;
  onFindClinic: () => void;
  onHide: () => void;
}) {
  const { c } = useDs();
  const soon = reminder.urgency === "asap";

  return (
    <View
      accessibilityRole="summary"
      style={{ borderRadius: 12, padding: 16, gap: 12, backgroundColor: soon ? c.rose : c.yellow }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: c.canvas, alignItems: "center", justifyContent: "center" }}>
          <Feather name="calendar" size={18} color={soon ? c.danger : c.charcoal} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>
            {reminder.title}
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>{reminder.message}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <DsButton
          label="Find a clinic"
          variant="secondary"
          block={false}
          onPress={onFindClinic}
          style={{ height: 44, backgroundColor: c.canvas }}
        />
        <AnimatedButton
          onPress={onHide}
          accessibilityRole="button"
          accessibilityLabel="Hide this reminder"
          style={{ height: 44, paddingHorizontal: 12, justifyContent: "center" }}
        >
          <Text style={{ fontSize: 14, color: c.charcoal }}>Hide</Text>
        </AnimatedButton>
      </View>
    </View>
  );
}
