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
    <DsScreen
      footer={
        <DsButton
          label="Open my dashboard"
          onPress={() => router.replace("/(home)/(tabs)/dashboard")}
          icon={<Feather name="arrow-right" size={17} color="#ffffff" />}
        />
      }
    >
      <View
        style={{
          borderRadius: 16,
          backgroundColor: "#EFF6FF",
          borderWidth: 1.5,
          borderColor: "#BFDBFE",
          padding: 20,
          marginBottom: 24,
        }}
      >
        <View
          style={{
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 9999,
            backgroundColor: "#ECFDF5",
            borderWidth: 1,
            borderColor: "#A7F3D0",
            marginBottom: 12,
          }}
        >
          <Feather name="check-circle" size={14} color="#059669" />
          <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#065F46", letterSpacing: 0.4 }}>
            SET-UP COMPLETE
          </Text>
        </View>

        <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 33, fontWeight: "700", letterSpacing: -0.5, color: "#0F172A" }}>
          {name ? `You're set, ${name}.` : "You're all set."} Here&apos;s day one.
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: "#475569", marginTop: 6 }}>
          Three simple habits to build. Each one keeps your heart steady.
        </Text>
      </View>

      <View style={{ marginBottom: 12 }}>
        {STEPS.map((s, i) => (
          <View key={s.when} className="flex-row" style={{ minHeight: 84 }}>
            <View style={{ width: 28, alignItems: "center" }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  borderWidth: 1.5,
                  borderColor: "#3B82F6",
                  backgroundColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#1D4ED8" }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, width: 2, marginVertical: 4, backgroundColor: "#E2E8F0" }} />
            </View>
            <View style={{ flex: 1, paddingLeft: 14, paddingBottom: 16 }}>
              <Text style={{ fontSize: 11.5, fontWeight: "700", color: c.steel, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {s.when}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink, marginTop: 2 }}>{s.title}</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate, marginTop: 2 }}>{s.body}</Text>
            </View>
          </View>
        ))}

        <View className="flex-row">
          <View style={{ width: 28, alignItems: "center" }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: "#EFF6FF",
                borderWidth: 1.5,
                borderColor: "#BFDBFE",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HeartLogo size={18} />
            </View>
          </View>
          <View style={{ flex: 1, paddingLeft: 14 }}>
            <Text style={{ fontSize: 11.5, fontWeight: "700", color: c.steel, textTransform: "uppercase", letterSpacing: 0.4 }}>
              By tonight
            </Text>
            <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink, marginTop: 2 }}>Your score updates</Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate, marginTop: 2 }}>
              See how today&apos;s actions strengthen your health stability.
            </Text>
          </View>
        </View>
      </View>
    </DsScreen>
  );
}
