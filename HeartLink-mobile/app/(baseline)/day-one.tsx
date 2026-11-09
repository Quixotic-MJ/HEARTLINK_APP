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
          backgroundColor: c.tint,
          borderWidth: 1.5,
          borderColor: c.hairline,
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
            backgroundColor: c.mint,
            borderWidth: 1,
            borderColor: c.hairline,
            marginBottom: 12,
          }}
        >
          <Feather name="check-circle" size={14} color={c.success} />
          <Text style={{ fontSize: 11.5, fontWeight: "700", color: c.charcoal, letterSpacing: 0.4 }}>
            SET-UP COMPLETE
          </Text>
        </View>

        <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 33, fontWeight: "700", letterSpacing: -0.5, color: c.ink }}>
          {name ? `You're set, ${name}.` : "You're all set."} Here&apos;s day one.
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate, marginTop: 6 }}>
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
                  borderColor: c.line,
                  backgroundColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: c.onTint }}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, width: 2, marginVertical: 4, backgroundColor: c.hairline }} />
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
                backgroundColor: c.tint,
                borderWidth: 1.5,
                borderColor: c.hairline,
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
