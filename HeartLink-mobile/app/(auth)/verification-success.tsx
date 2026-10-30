import React from "react";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import "../../global.css";
import HeartLogo from "../../components/ui/HeartLogo";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";
import { useToast } from "../../contexts/ToastContext";
import { useSetAccountKind } from "../../hooks/useFamily";

const TRUST: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: "lock", text: "Your session is encrypted end to end" },
  { icon: "shield", text: "Your health data is stored securely" },
];

export default function VerificationSuccessScreen() {
  const router = useRouter();
  const { c } = useDs();
  const { showToast } = useToast();
  // HL-087: someone here only to follow a family member skips the health set-up
  const setKind = useSetAccountKind();
  const followFamily = () =>
    setKind.mutate("family", {
      onSuccess: () => router.replace("/(family)/follow"),
      onError: (e) => showToast({ title: "Couldn't continue", message: e.message, type: "error" }),
    });

  return (
    <DsScreen
      centered
      header={
        <View className="flex-row items-center px-6 pt-3 pb-2" style={{ gap: 10 }}>
          <HeartLogo size={26} />
          <Text style={{ fontSize: 18, fontWeight: "700", letterSpacing: -0.4, color: c.ink }}>
            HeartLink
          </Text>
        </View>
      }
      footer={
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ gap: 6 }}>
          <DsButton
            label="Set up my profile"
            onPress={() => router.replace("/(baseline)/start")}
            icon={<Feather name="arrow-right" size={16} color="#FFFFFF" />}
          />
          <DsButton
            label="I'm here to follow a family member"
            variant="link"
            onPress={followFamily}
            loading={setKind.isPending}
          />
        </Animated.View>
      }
    >
      <Animated.View
        entering={ZoomIn.duration(450).springify().damping(12).stiffness(160)}
        style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          backgroundColor: "#ECFDF5",
          borderWidth: 1,
          borderColor: "#A7F3D0",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        <Feather name="check" size={30} color="#059669" />
      </Animated.View>

      <Animated.View entering={FadeIn.delay(120).duration(400)}>
        <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, fontWeight: "700", letterSpacing: -0.6, color: c.ink }}>
          You&apos;re verified
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate, marginTop: 6, marginBottom: 28 }}>
          Your account is ready. Next, a few short questions to personalize your starting health score.
        </Text>

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
          {TRUST.map((t, i) => (
            <View
              key={t.text}
              className="flex-row items-center"
              style={{
                gap: 12,
                minHeight: 52,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: c.hairline,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: c.tint,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={t.icon} size={16} color={c.primary} />
              </View>
              <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "500", color: c.ink }}>{t.text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </DsScreen>
  );
}
