import React from "react";
import { Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import AnimatedButton from "../ui/AnimatedButton";
import { useDs } from "../onboarding/useDs";
import { effortLabel } from "../../services/exerciseSession";

/**
 * HL-095: how hard a session felt, 0 to 10. HeartLink's own simple scale, not a licensed one, pending the
 * physiotherapist's review. It's about effort only: feeling unwell is always reported separately.
 */
export function EffortPicker({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  const { c } = useDs();
  return (
    <View style={{ gap: 8 }}>
      <View accessibilityRole="radiogroup" accessibilityLabel="How hard it felt, 0 to 10" style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {Array.from({ length: 11 }, (_, n) => {
          const on = value === n;
          return (
            <AnimatedButton
              key={n}
              onPress={() => {
                Haptics.selectionAsync();
                onChange(n);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${n} out of 10, ${effortLabel(n)}`}
              style={{
                width: "14.5%",
                flexGrow: 1,
                height: 44,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: on ? 2 : 1,
                borderColor: on ? c.line : c.hairline,
                backgroundColor: on ? c.tint : c.canvas,
              }}
            >
              <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: on ? "600" : "400", color: on ? c.onTint : c.charcoal }}>{n}</Text>
            </AnimatedButton>
          );
        })}
      </View>
      <Text style={{ fontSize: 13, color: c.slate }}>{value === null ? "0 is no effort, 10 is the hardest you can imagine." : effortLabel(value)}</Text>
    </View>
  );
}
