import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import "../../global.css";
import HeartLogo from "../../components/ui/HeartLogo";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";

const TRUST: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: "lock", text: "Your session is encrypted end to end" },
  { icon: "shield", text: "Your health data is stored securely" },
];

export default function VerificationSuccessScreen() {
  const router = useRouter();
  const { c } = useDs();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 200, useNativeDriver: true }),
    ]).start();
  }, [opacityAnim, scaleAnim, slideAnim]);

  return (
    <DsScreen
      centered
      header={
        <View className="flex-row items-center px-6 pt-4" style={{ gap: 10 }}>
          <HeartLogo size={24} />
          <Text style={{ fontSize: 17, fontWeight: "600", letterSpacing: -0.2, color: c.ink }}>HeartLink</Text>
        </View>
      }
      footer={<DsButton label="Set up my profile" onPress={() => router.replace("/(baseline)/start")} />}
    >
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
          width: 56,
          height: 56,
          borderRadius: 12,
          backgroundColor: c.mint,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <Feather name="check" size={28} color={c.charcoal} />
      </Animated.View>

      <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
        <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 35, fontWeight: "600", letterSpacing: -0.5, color: c.ink }}>
          You&apos;re verified
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: c.slate, marginTop: 8, marginBottom: 24 }}>
          Your account is ready. Next, a few short questions to set your starting score.
        </Text>

        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, paddingHorizontal: 16, paddingVertical: 4 }}>
          {TRUST.map((t, i) => (
            <View
              key={t.text}
              className="flex-row items-center"
              style={{ gap: 12, minHeight: 52, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.hairlineSoft }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 6, backgroundColor: c.tint, alignItems: "center", justifyContent: "center" }}>
                <Feather name={t.icon} size={16} color={c.charcoal} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: "500", color: c.ink }}>{t.text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </DsScreen>
  );
}
