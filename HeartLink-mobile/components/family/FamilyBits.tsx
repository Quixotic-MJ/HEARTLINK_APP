import React from "react";
import { Text, View } from "react-native";
import { useDs } from "../onboarding/useDs";
import { SquareIconButton } from "../exercise/ExerciseBits";
import AnimatedButton from "../ui/AnimatedButton";

// HL-087: small pieces shared by the family sharing screens.

/** Back button and title, like Settings and the Health report. */
export function PageHeader({ title, onBack, right }: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12, minHeight: 64 }}>
      {onBack ? <SquareIconButton icon="arrow-left" label="Go back" onPress={onBack} /> : null}
      <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink" style={{ flexShrink: 1 }}>
        {title}
      </Text>
      {right ? <View style={{ marginLeft: "auto" }}>{right}</View> : null}
    </View>
  );
}

/** A round initial for a person. */
export function Initial({ name }: { name: string }) {
  const { c } = useDs();
  return (
    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.peach, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: c.warmText }}>{(name.trim()[0] ?? "?").toUpperCase()}</Text>
    </View>
  );
}

/** One person in a list, with an optional action on the right (Remove, or a chevron to open). */
export function PersonRow({
  name,
  note,
  action,
  onAction,
  onPress,
  last = false,
}: {
  name: string;
  note: string;
  action?: string;
  onAction?: () => void;
  onPress?: () => void;
  last?: boolean;
}) {
  const { c } = useDs();
  const body = (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16, minHeight: 64, borderBottomWidth: last ? 0 : 1, borderBottomColor: c.hairlineSoft }}
    >
      <Initial name={name} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink }}>{name}</Text>
        <Text style={{ fontSize: 13, color: c.slate }}>{note}</Text>
      </View>
      {action && onAction ? (
        <AnimatedButton
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={`${action} ${name}`}
          style={{ height: 40, paddingHorizontal: 12, justifyContent: "center", borderRadius: 8, borderWidth: 1, borderColor: c.hairline }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: c.danger }}>{action}</Text>
        </AnimatedButton>
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <AnimatedButton onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}, ${note}`}>
      {body}
    </AnimatedButton>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  const { c } = useDs();
  return <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, overflow: "hidden" }}>{children}</View>;
}
