import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import HeartLogo from "../../components/ui/HeartLogo";
import AnimatedButton from "../../components/ui/AnimatedButton";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";
import { useBaseline } from "../../contexts/BaselineContext";
import GetHelpNote from "../../components/onboarding/GetHelpNote";

const POINTS: { yes: boolean; title: string; body: string }[] = [
  { yes: true, title: "Made for everyday heart health", body: "For adults who want to look after their heart, or who may be at risk of high blood pressure." },
  { yes: true, title: "Helps you build daily habits", body: "Blood pressure, meals, sleep and movement in one place." },
  { yes: true, title: "Already have high blood pressure?", body: "You can use it to keep track. Keep following your doctor's plan." },
  { yes: true, title: "Shows your week as a score", body: "One number, based on your last 7 days of logs." },
  { yes: false, title: "It isn't a diagnosis", body: "It doesn't replace your doctor or your medicine." },
  // HL-164 (panel revision)
  {
    yes: false,
    title: "It can make mistakes",
    body: "Its scores, limits and suggestions are estimates and can be wrong. Used carelessly, or instead of your doctor's advice, it could make a health problem worse.",
  },
  { yes: false, title: "Not a care plan for heart conditions", body: "If you've been diagnosed with heart disease or had a stroke, ask your doctor before following its exercise or food suggestions." },
];

// "Before we start": what HeartLink is and isn't, and when to get help right away.
export default function StartScreen() {
  const router = useRouter();
  const { c } = useDs();
  const { data, updateData } = useBaseline();
  const [agreed, setAgreed] = useState(data.agreed_notice);

  return (
    <DsScreen
      header={
        <View className="flex-row items-center px-6 pt-3 pb-2" style={{ gap: 10 }}>
          <HeartLogo size={26} />
          <Text style={{ fontSize: 18, fontWeight: "700", letterSpacing: -0.4, color: c.ink }}>
            HeartLink
          </Text>
        </View>
      }
      footer={
        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={{ gap: 6 }}>
          <DsButton
            label="Continue"
            disabled={!agreed}
            onPress={() => {
              updateData({ agreed_notice: true });
              router.replace("/(baseline)/health-check");
            }}
            accessibilityHint="Opens the health check"
            icon={<Feather name="arrow-right" size={16} color={!agreed ? c.steel : "#FFFFFF"} />}
          />
        </Animated.View>
      }
    >
      <Animated.View entering={FadeIn.duration(400)} style={{ marginBottom: 24 }}>
        <Text
          accessibilityRole="header"
          style={{ fontSize: 28, lineHeight: 36, fontWeight: "700", letterSpacing: -0.6, color: c.ink }}
        >
          Before we start
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate, marginTop: 6 }}>
          A quick, honest look at what HeartLink does and does not do.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(400)}>
        <View
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.hairline,
            backgroundColor: c.surfaceAlt,
            paddingHorizontal: 16,
            paddingVertical: 4,
          }}
        >
          {POINTS.map((p, i) => (
            <View
              key={p.title}
              className="flex-row"
              style={{
                gap: 12,
                paddingVertical: 14,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: c.hairline,
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: p.yes ? c.mint : c.surfaceAlt,
                  borderWidth: 1,
                  borderColor: p.yes ? c.hairline : c.hairline,
                  marginTop: 1,
                }}
              >
                <Feather
                  name={p.yes ? "check" : "x"}
                  size={16}
                  color={p.yes ? c.success : c.steel}
                />
              </View>
              <View className="flex-1">
                <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{p.title}</Text>
                <Text style={{ fontSize: 13.5, lineHeight: 20, color: c.slate, marginTop: 2 }}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <GetHelpNote style={{ marginTop: 16 }} />

        <AnimatedButton
          onPress={() => setAgreed((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          accessibilityLabel="I understand HeartLink can make mistakes and isn't medical advice, and I'll use it alongside my doctor's care"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            minHeight: 48,
            marginTop: 16,
            paddingVertical: 4,
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: agreed ? c.primary : "transparent",
              borderWidth: agreed ? 0 : 1.5,
              borderColor: agreed ? c.primary : c.hairlineStrong,
              shadowColor: agreed ? c.primary : "transparent",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: agreed ? 0.25 : 0,
              shadowRadius: 4,
              elevation: agreed ? 2 : 0,
            }}
          >
            {agreed ? <Feather name="check" size={14} color="#ffffff" /> : null}
          </View>
          <Text style={{ flex: 1, fontSize: 13.5, lineHeight: 20, color: c.ink }}>
            I understand HeartLink can make mistakes and isn&apos;t medical advice, and I&apos;ll use it alongside my
            doctor&apos;s care.
          </Text>
        </AnimatedButton>
      </Animated.View>
    </DsScreen>
  );
}
