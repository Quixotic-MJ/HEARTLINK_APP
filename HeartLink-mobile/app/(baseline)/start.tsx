import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import HeartLogo from "../../components/ui/HeartLogo";
import AnimatedButton from "../../components/ui/AnimatedButton";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";

const POINTS: { yes: boolean; title: string; body: string }[] = [
  { yes: true, title: "Helps you build daily habits", body: "Blood pressure, meals, sleep and movement in one place." },
  { yes: true, title: "Shows your trend as a score", body: "One number that moves with what you log." },
  { yes: false, title: "It isn't a diagnosis", body: "It doesn't replace your doctor or your medicine." },
];

// "Before we start": what HeartLink is and isn't, and when to get help right away.
export default function StartScreen() {
  const router = useRouter();
  const { c } = useDs();
  const [agreed, setAgreed] = useState(false);

  return (
    <DsScreen
      footer={
        <DsButton
          label="Continue"
          disabled={!agreed}
          onPress={() => router.replace("/(baseline)/plan")}
          accessibilityHint="Opens the set-up questions"
        />
      }
    >
      <View style={{ marginBottom: 18 }}>
        <HeartLogo size={36} />
      </View>
      <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 35, fontWeight: "600", letterSpacing: -0.5, color: c.ink }}>
        Before we start
      </Text>
      <Text style={{ fontSize: 16, lineHeight: 24, color: c.slate, marginTop: 8, marginBottom: 22 }}>
        A quick, honest look at what HeartLink does.
      </Text>

      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, paddingHorizontal: 16, paddingVertical: 4 }}>
        {POINTS.map((p, i) => (
          <View
            key={p.title}
            className="flex-row"
            style={{ gap: 12, paddingVertical: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.hairlineSoft }}
          >
            <View
              style={{ width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center", backgroundColor: p.yes ? c.mint : c.surfaceAlt }}
            >
              <Feather name={p.yes ? "check" : "x"} size={16} color={c.charcoal} />
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{p.title}</Text>
              <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate, marginTop: 2 }}>{p.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <View
        accessibilityRole="alert"
        className="flex-row"
        style={{ gap: 12, marginTop: 14, padding: 16, borderRadius: 12, backgroundColor: c.rose }}
      >
        <Feather name="alert-triangle" size={20} color={c.danger} style={{ marginTop: 1 }} />
        <View className="flex-1">
          <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>When to get help right away</Text>
          <Text style={{ fontSize: 14, lineHeight: 21, color: c.charcoal, marginTop: 4 }}>
            A reading of 180/120 or higher, chest pain, trouble breathing or sudden weakness. Call 911 or go to the nearest hospital.
          </Text>
        </View>
      </View>

      <AnimatedButton
        onPress={() => setAgreed((v) => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel="I understand HeartLink supports healthy habits and isn't medical advice"
        style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, marginTop: 14 }}
      >
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: agreed ? c.line : "transparent",
            borderWidth: agreed ? 0 : 1.5,
            borderColor: c.hairlineStrong,
          }}
        >
          {agreed ? <Feather name="check" size={14} color="#ffffff" /> : null}
        </View>
        <Text style={{ flex: 1, fontSize: 14, lineHeight: 21, color: c.ink }}>
          I understand HeartLink supports healthy habits and isn&apos;t medical advice.
        </Text>
      </AnimatedButton>
    </DsScreen>
  );
}
