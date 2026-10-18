import React from "react";
import { Text, TextInput, View } from "react-native";
import type { RiskResult } from "../meals/SharedMealComponents";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { FoodSource, SOURCE_RULES } from "../../services/foodLogging";

// HL-032: small pieces shared by the food search, review and logged screens.

/** Back button and screen title, as on the onboarding screens. */
export function FoodHeader({
  title,
  onBack,
  backLabel = "Go back",
  right,
}: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  /** An optional button on the right, e.g. the torch on the barcode screen. */
  right?: React.ReactNode;
}) {
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
      <Text accessibilityRole="header" style={{ flex: 1, fontSize: 22, fontWeight: "600", color: c.ink }} numberOfLines={1}>
        {title}
      </Text>
      {right}
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

/**
 * The meal impact note from calcRiskFromValues, on the design system's tints:
 * rose for high sodium (dark text, never red on pink), peach for moderate, mint for heart-friendly.
 */
export function ImpactNote({ risk }: { risk: RiskResult }) {
  const { c } = useDs();
  const tone =
    risk.level === "High Sodium"
      ? { bg: c.rose, icon: c.danger, text: c.charcoal }
      : risk.level === "Moderate"
        ? { bg: c.peach, icon: c.warmText, text: c.warmText }
        : { bg: c.mint, icon: c.success, text: c.charcoal };
  return (
    <View accessible accessibilityLabel={`${risk.level}. ${risk.desc}`} style={{ flexDirection: "row", gap: 10, padding: 14, borderRadius: 12, backgroundColor: tone.bg }}>
      <Feather name={risk.icon} size={18} color={tone.icon} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: tone.text }}>{risk.level}</Text>
        <Text style={{ fontSize: 14, lineHeight: 20, color: tone.text }}>{risk.desc}</Text>
      </View>
    </View>
  );
}

/** A labelled number box with its unit, 48px tall. */
export function NutrientField({
  label,
  value,
  unit,
  onChange,
  placeholder = "0",
}: {
  label: string;
  value: string;
  unit: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { c } = useDs();
  return (
    <View style={{ flexBasis: "47%", flexGrow: 1, gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>{label}</Text>
      <View className="flex-row items-center" style={{ height: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: c.hairlineStrong, borderRadius: 8, backgroundColor: c.canvas }}>
        <TextInput
          value={value}
          onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ""))}
          placeholder={placeholder}
          placeholderTextColor={c.steel}
          keyboardType="decimal-pad"
          accessibilityLabel={`${label} in ${unit}`}
          style={{ flex: 1, fontSize: 17, color: c.ink, paddingVertical: 0 }}
        />
        <Text style={{ fontSize: 14, fontWeight: "500", color: c.steel, marginLeft: 6 }}>{unit}</Text>
      </View>
    </View>
  );
}

/** − value + with 44px buttons, for servings. */
export function AmountStepper({ label, value, onLess, onMore }: { label: string; value: string; onLess: () => void; onMore: () => void }) {
  const { c } = useDs();
  const box = { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairlineStrong, backgroundColor: c.canvas, alignItems: "center" as const, justifyContent: "center" as const };
  return (
    <View className="flex-row items-center" style={{ gap: 4 }}>
      <AnimatedButton onPress={onLess} accessibilityRole="button" accessibilityLabel={`Less ${label}`} style={box}>
        <Feather name="minus" size={18} color={c.ink} />
      </AnimatedButton>
      <Text style={{ minWidth: 92, textAlign: "center", fontSize: 17, fontWeight: "600", color: c.ink }} accessibilityLabel={`${label}: ${value}`}>
        {value}
      </Text>
      <AnimatedButton onPress={onMore} accessibilityRole="button" accessibilityLabel={`More ${label}`} style={box}>
        <Feather name="plus" size={18} color={c.ink} />
      </AnimatedButton>
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
