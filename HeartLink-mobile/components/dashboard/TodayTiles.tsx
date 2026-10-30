import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { light, dark } from "../../constants/theme";

/** What the backend says about today's medicine; older servers send only medication_taken. */
export type MedicineStatus = "taken" | "not_yet" | "none";

function Bar({ value, track, fill }: { value: number; track: string; fill: string }) {
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: track, overflow: "hidden" }}>
      <View style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, height: "100%", borderRadius: 4, backgroundColor: fill }} />
    </View>
  );
}

function Tile({ title, action, onPress, label, children }: {
  title: string; action?: React.ReactNode; onPress: () => void; label: string; children: React.ReactNode;
}) {
  const { c } = useDs();
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flex: 1, borderWidth: 1, borderColor: c.hairline, borderRadius: 14, backgroundColor: c.canvas, padding: 14, gap: 8 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 22 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>{title}</Text>
        {action}
      </View>
      {children}
    </AnimatedButton>
  );
}

/** Today's check-ins (blood pressure, meals, movement, sleep): how many are done and which comes next. */
export function CheckinsTile({ done, total, next, onPress }: { done: number; total: number; next: string | null; onPress: () => void }) {
  const { c } = useDs();
  return (
    <Tile
      title="Check-ins"
      onPress={onPress}
      label={`Check-ins: ${done} of ${total} done today.${next ? ` Next: ${next}.` : ""}`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Feather name="check-circle" size={20} color={c.primary} />
        <Text style={{ fontSize: 20, fontWeight: "700", color: c.ink }}>
          {done} of {total}
        </Text>
      </View>
      <Text numberOfLines={1} style={{ fontSize: 13, color: c.slate }}>
        {next ? `Next: ${next}` : "All done today"}
      </Text>
      <Bar value={total ? done / total : 0} track={c.tint} fill={c.primary} />
    </Tile>
  );
}

/** Today's medicine, from the check-in's "Did you take your medicine?" answer. */
export function MedicineTile({ status, onPress }: { status: MedicineStatus; onPress: () => void }) {
  const { c, isDark } = useDs();
  const t = isDark ? dark : light;
  const text = status === "taken" ? "Taken" : status === "none" ? "None to take" : "Not yet";
  const sub = status === "taken" ? "Today" : status === "none" ? "From your check-in" : "Answer in your check-in";
  return (
    <Tile
      title="Medicine"
      onPress={onPress}
      label={`Medicine: ${text}. Opens the check-in.`}
      action={<Feather name="plus" size={20} color={c.ink} />}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Feather
          name={status === "taken" ? "check-circle" : status === "none" ? "minus-circle" : "clock"}
          size={20}
          color={status === "taken" ? t.successText : c.slate}
        />
        <Text style={{ fontSize: 20, fontWeight: "700", color: c.ink }}>{text}</Text>
      </View>
      <Text numberOfLines={1} style={{ fontSize: 13, color: c.slate }}>{sub}</Text>
      <Bar value={status === "taken" ? 1 : 0} track={c.rose} fill={t.successText} />
    </Tile>
  );
}
