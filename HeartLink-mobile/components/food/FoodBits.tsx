import React from "react";
import { Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { FoodSource, SOURCE_RULES } from "../../services/foodLogging";

// HL-032: small pieces shared by the food search, review and logged screens.

/** Back button and screen title, as on the onboarding screens. */
export function FoodHeader({ title, onBack, backLabel = "Go back" }: { title: string; onBack?: () => void; backLabel?: string }) {
  const { c } = useDs();
  return (
    <View className="flex-row items-center px-5 pt-3 pb-2" style={{ gap: 10 }}>
      {onBack ? (
        <AnimatedButton
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairline, alignItems: "center", justifyContent: "center", backgroundColor: c.canvas }}
        >
          <Feather name="arrow-left" size={20} color={c.ink} />
        </AnimatedButton>
      ) : null}
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: "600", color: c.ink }} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
}

/** Where a food's numbers come from: sky for HeartLink, peach for Open Food Facts, grey for the patient's own. */
export function SourceTag({ source }: { source: FoodSource }) {
  const { c } = useDs();
  const rule = SOURCE_RULES[source];
  const colours =
    source === "recipe"
      ? { bg: c.sky, fg: c.onTint }
      : source === "packaged"
        ? { bg: c.peach, fg: c.warmText }
        : { bg: c.surfaceAlt, fg: c.charcoal };
  return (
    <View className="flex-row items-center self-start" style={{ gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colours.bg }}>
      {rule.locked ? <Feather name="lock" size={12} color={colours.fg} /> : null}
      <Text style={{ fontSize: 13, fontWeight: "600", color: colours.fg }}>{rule.tag}</Text>
    </View>
  );
}

/** A square tick box that fills blue when on (picture only; the whole row is the button). */
export function TickBox({ on }: { on: boolean }) {
  const { c } = useDs();
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: on ? c.line : c.hairlineStrong,
        backgroundColor: on ? c.line : c.canvas,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {on ? <Feather name="check" size={14} color="#ffffff" /> : null}
    </View>
  );
}

/** Outlined button with an icon, for the quieter actions next to the main one. */
export function OutlineButton({ label, icon, onPress }: { label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }) {
  const { c } = useDs();
  return (
    <AnimatedButton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{ flex: 1, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairlineStrong, backgroundColor: c.canvas, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
    >
      <Feather name={icon} size={17} color={c.ink} />
      <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>{label}</Text>
    </AnimatedButton>
  );
}
