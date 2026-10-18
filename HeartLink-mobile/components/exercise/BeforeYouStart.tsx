import React, { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import DsButton from "../onboarding/DsButton";
import { CheckList } from "../onboarding/Controls";
import { useDs } from "../onboarding/useDs";
import { SquareIconButton } from "./ExerciseBits";
import { Routine, checklistFor } from "../../services/exerciseSession";

// Before the countdown: a few quick ticks so the patient sets up safely, built from the exercise
// itself (its equipment, its position, the expert's reasons to skip it), and the signs to stop.
// The list is also read out loud. (Wording to be checked by the adviser.)

/** The warning signs shown for every exercise; the expert can add more per exercise. */
export const STANDARD_STOP_SIGNS = ["Chest pain or tightness", "Feeling dizzy or faint", "Not being able to catch your breath"];

export interface BeforeYouStartProps {
  routine: Pick<Routine, "title" | "requirements" | "position" | "skipIf" | "stopIf">;
  onReady: () => void;
  onBack: () => void;
  /** Spoken instructions. */
  say: (text: string) => void;
}

function Bullets({ items, color }: { items: string[]; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      {items.map((item) => (
        <View key={item} className="flex-row" style={{ gap: 8 }}>
          <Text style={{ fontSize: 15, lineHeight: 22, color }}>•</Text>
          <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function BeforeYouStart({ routine, onReady, onBack, say }: BeforeYouStartProps) {
  const { c } = useDs();
  const insets = useSafeAreaInsets();
  const items = checklistFor(routine);
  const [ticked, setTicked] = useState<string[]>([]);
  const left = items.filter((i) => !ticked.includes(i.value)).length;
  const stopSigns = [...STANDARD_STOP_SIGNS, ...routine.stopIf];

  const readOut = useRef({ say, labels: items.filter((i) => i.value !== "skip").map((i) => i.label.toLowerCase()), skip: routine.skipIf });
  useEffect(() => {
    const { say: speak, labels, skip } = readOut.current;
    const list = labels.length > 1 ? `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}` : labels[0] ?? "";
    speak(
      `Before you start, check that you have ${list}.${skip.length ? ` Skip this exercise today if: ${skip.join(", ")}.` : ""} Tap each one when it's ready.`,
    );
  }, []);

  const toggle = (value: string) => setTicked((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas, paddingTop: insets.top }}>
      <View className="flex-row items-center px-5 pt-3 pb-2" style={{ gap: 10 }}>
        <SquareIconButton icon="arrow-left" label="Back to the exercise" onPress={onBack} />
        <Text style={{ flex: 1, fontSize: 15, color: c.slate }} numberOfLines={1}>
          {routine.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "600", color: c.ink }}>
            Before you start
          </Text>
          <Text style={{ fontSize: 16, lineHeight: 23, color: c.slate }}>{"A quick check so you can exercise safely. Tap each one when it's ready."}</Text>
        </View>

        {routine.skipIf.length > 0 ? (
          <View style={{ backgroundColor: c.yellow, borderRadius: 12, padding: 16, gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>Skip this exercise today if:</Text>
            <Bullets items={routine.skipIf} color={c.charcoal} />
            <DsButton label="Choose another exercise" variant="link" onPress={onBack} style={{ alignSelf: "flex-start" }} />
          </View>
        ) : null}

        <CheckList options={items} selected={ticked} onToggle={toggle} accessibilityLabel="Before you start checklist" />

        <View className="flex-row" style={{ backgroundColor: c.rose, borderRadius: 12, padding: 16, gap: 12 }}>
          <Feather name="alert-triangle" size={22} color={c.danger} style={{ marginTop: 1 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{'Stop right away and tap "I feel unwell" if you have:'}</Text>
            <Bullets items={stopSigns} color={c.charcoal} />
            <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>{"If it doesn't ease with rest, get checked in person."}</Text>
          </View>
        </View>
      </ScrollView>

      <View className="px-5" style={{ paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 8, borderTopWidth: 1, borderTopColor: c.hairlineSoft }}>
        <DsButton label={left === 0 ? "I'm ready" : `Tick ${left} more to start`} disabled={left > 0} onPress={onReady} />
      </View>
    </View>
  );
}
