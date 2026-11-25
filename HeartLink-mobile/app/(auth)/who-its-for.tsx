import React from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import HeartLogo from "../../components/ui/HeartLogo";
import DsButton from "../../components/onboarding/DsButton";
import { DsScreen } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";
import { NOT_MADE_FOR, MADE_FOR } from "../../services/setupScreening";

/**
 * 2026-11-25 (panel revision): "Is HeartLink for you?", shown before sign-up (Get started) and from the welcome screen's
 * "Who is HeartLink for?" link. Says who HeartLink is for and the conditions it isn't made for. The tick-box health
 * check after sign-up (HL-164) still asks each person.
 */
export default function WhoItsForScreen() {
  const router = useRouter();
  const { c } = useDs();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const justReading = from === "welcome";
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/onboarding"));

  const Row = ({ yes, title, body, first }: { yes: boolean; title: string; body?: string; first: boolean }) => (
    <View
      className="flex-row"
      style={{ gap: 12, paddingVertical: 13, borderTopWidth: first ? 0 : 1, borderTopColor: c.hairline }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: yes ? c.mint : c.peach,
          borderWidth: 1,
          borderColor: c.hairline,
          marginTop: 1,
        }}
      >
        <Feather name={yes ? "check" : "x"} size={16} color={yes ? c.success : c.warmText} />
      </View>
      <View className="flex-1">
        <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{title}</Text>
        {body ? <Text style={{ fontSize: 13.5, lineHeight: 20, color: c.slate, marginTop: 2 }}>{body}</Text> : null}
      </View>
    </View>
  );

  const box = {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.hairline,
    backgroundColor: c.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 2,
  } as const;

  return (
    <DsScreen
      header={
        <View className="flex-row items-center px-6 pt-3 pb-2" style={{ gap: 10 }}>
          <HeartLogo size={26} />
          <Text style={{ fontSize: 18, fontWeight: "700", letterSpacing: -0.4, color: c.ink }}>HeartLink</Text>
        </View>
      }
      footer={
        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={{ gap: 6 }}>
          {justReading ? (
            <DsButton label="Got it" onPress={goBack} />
          ) : (
            <>
              <DsButton
                label="This is me, continue"
                onPress={() => router.push("/register")}
                accessibilityHint="Opens the sign-up form"
                icon={<Feather name="arrow-right" size={16} color="#FFFFFF" />}
              />
              <DsButton label="Go back" variant="secondary" onPress={goBack} />
            </>
          )}
        </Animated.View>
      }
    >
      <Animated.View entering={FadeIn.duration(400)} style={{ marginBottom: 20 }}>
        <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 36, fontWeight: "700", letterSpacing: -0.6, color: c.ink }}>
          Is HeartLink for you?
        </Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate, marginTop: 6 }}>
          HeartLink is for adults aged 18 and over.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(400)} style={{ gap: 18 }}>
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>HeartLink is for you if you:</Text>
          <View style={box}>
            {MADE_FOR.map((p, i) => (
              <Row key={p.title} yes title={p.title} body={p.body} first={i === 0} />
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink }}>HeartLink isn&apos;t made for people who have:</Text>
          <View style={box}>
            {NOT_MADE_FOR.map((p, i) => (
              <Row key={p.title} yes={false} title={p.title} body={p.body} first={i === 0} />
            ))}
          </View>
          <Text style={{ fontSize: 14, lineHeight: 21, fontWeight: "600", color: c.ink, marginTop: 4 }}>
            If one of these applies to you, talk to your doctor before using HeartLink.
          </Text>
        </View>
      </Animated.View>
    </DsScreen>
  );
}
