import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import HeartLogo from "../../components/ui/HeartLogo";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";

const STEPS: { when: string; title: string; body: string }[] = [
  { when: "Morning", title: "Log your blood pressure", body: "Takes a minute with your monitor." },
  { when: "Midday", title: "Pick a heart-friendly lunch", body: "Every recipe shows its sodium." },
  { when: "Evening", title: "A short walk at your pace", body: "Matched to how active you are now." },
];

// Last onboarding screen: what day one looks like, then the dashboard.
export default function DayOneScreen() {
  const router = useRouter();
  const { c } = useDs();
  const { name } = useLocalSearchParams<{ name?: string }>();

  return (
    <DsScreen footer={<DsButton label="Open my dashboard" onPress={() => router.replace("/(home)/(tabs)/dashboard")} />}>
      <View style={{ borderRadius: 12, backgroundColor: c.yellowBold, padding: 20, marginBottom: 24 }}>
        <View className="flex-row items-center" style={{ gap: 8, marginBottom: 12 }}>
          <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: c.charcoal, alignItems: "center", justifyContent: "center" }}>
            <Feather name="check" size={14} color={c.yellowBold} />
          </View>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#37352f" }}>Set-up complete</Text>
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, fontWeight: "600", letterSpacing: -0.5, color: "#1a1a1a" }}>
          {name ? `You're set, ${name}.` : "You're all set."} Here&apos;s day one.
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 23, color: "#37352f", marginTop: 6 }}>Three small things. Each one moves your score.</Text>
      </View>

      {STEPS.map((s, i) => (
        <View key={s.when} className="flex-row" style={{ minHeight: 84 }}>
          <View style={{ width: 24, alignItems: "center" }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: c.hairlineStrong, backgroundColor: c.canvas }} />
            <View style={{ flex: 1, width: 1, marginTop: 4, backgroundColor: c.hairlineStrong }} />
          </View>
          <View style={{ flex: 1, paddingLeft: 14, paddingBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: "500", color: c.steel }}>{s.when}</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginTop: 2 }}>{s.title}</Text>
            <Text style={{ fontSize: 14, color: c.slate, marginTop: 2 }}>{s.body}</Text>
          </View>
        </View>
      ))}
      <View className="flex-row">
        <View style={{ width: 24, alignItems: "center" }}>
          <HeartLogo size={22} />
        </View>
        <View style={{ flex: 1, paddingLeft: 14 }}>
          <Text style={{ fontSize: 12, fontWeight: "500", color: c.steel }}>By tonight</Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink, marginTop: 2 }}>Your score updates</Text>
        </View>
      </View>
    </DsScreen>
  );
}
