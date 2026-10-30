import React, { useCallback, useState } from "react";
import { ActivityIndicator, BackHandler, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../../components/ui/AnimatedButton";
import DsButton from "../../components/onboarding/DsButton";
import SetupHeader from "../../components/onboarding/SetupHeader";
import FinishLaterDialog from "../../components/onboarding/FinishLaterDialog";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { DsScreen, IconBadge, InfoNote, enter } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";
import { useBaseline } from "../../contexts/BaselineContext";
import {
  SETUP_PART_LIST,
  PartNumber,
  isPartDone,
  visibleQuestions,
  isAnswered,
} from "../../constants/setupQuestions";

// Set-up map: the four parts, which are done, and where to carry on.
export default function PlanScreen() {
  const router = useRouter();
  const { c } = useDs();
  const { data, loaded } = useBaseline();
  const [finishLater, setFinishLater] = useState(false);

  // This is the first set-up screen, so Android back opens "Finish later" instead of leaving.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        setFinishLater(true);
        return true;
      });
      return () => sub.remove();
    }, [])
  );

  const done = SETUP_PART_LIST.map((p) => isPartDone(p.n, data));
  const nextPart = SETUP_PART_LIST.find((p, i) => !done[i]);
  const started = SETUP_PART_LIST.some((p) => visibleQuestions(data, p.n).some((q) => isAnswered(q, data)));

  const openPart = (n: PartNumber) => {
    const qs = visibleQuestions(data, n);
    const first = qs.find((q) => !isAnswered(q, data)) ?? qs[0];
    router.push({ pathname: "/(baseline)/question/[id]", params: { id: first.id } });
  };

  const title = !started
    ? "Let's get your starting score."
    : nextPart
    ? "Welcome back. Let's carry on."
    : "All four parts are done.";
  const cta = nextPart
    ? `${started ? "Continue with" : "Start with"} ${nextPart.name}`
    : "See my starting score";

  return (
    <>
      <DsScreen
        header={<SetupHeader title="Set-up" onFinishLater={() => setFinishLater(true)} />}
        footer={
          <Animated.View entering={FadeInDown.delay(180).duration(400)} style={{ gap: 6 }}>
            <DsButton
              label={cta}
              disabled={!loaded}
              onPress={() => (nextPart ? openPart(nextPart.n) : router.push("/(baseline)/score"))}
              icon={<Feather name="arrow-right" size={16} color="#FFFFFF" />}
            />
          </Animated.View>
        }
      >
        {!loaded ? (
          <ActivityIndicator color={c.primary} />
        ) : (
          <>
            <Animated.View entering={FadeIn.duration(400)}>
              <Text
                accessibilityRole="header"
                style={{
                  fontSize: 28,
                  lineHeight: 36,
                  fontWeight: "700",
                  letterSpacing: -0.6,
                  color: c.ink,
                }}
              >
                {title}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  lineHeight: 22,
                  color: c.slate,
                  marginTop: 6,
                  marginBottom: 24,
                }}
              >
                Four short parts, about 4 minutes. Your answers save as you go.
              </Text>
            </Animated.View>

            <View style={{ gap: 12 }}>
              {SETUP_PART_LIST.map((p, i) => {
                const isNext = nextPart?.n === p.n;
                const isDone = done[i];
                return (
                  <Animated.View key={p.n} entering={enter(i)}>
                    <AnimatedButton
                      onPress={() => openPart(p.n)}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.name}. ${p.summary}. ${
                        isDone ? "Done, tap to change answers" : isNext ? "Up next" : "Not started"
                      }`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 14,
                        padding: 16,
                        borderRadius: 14,
                        backgroundColor: c.canvas,
                        borderWidth: isNext ? 2 : 1,
                        borderColor: isNext ? c.primary : c.hairline,
                        ...(isNext
                          ? {
                              shadowColor: c.primary,
                              shadowOffset: { width: 0, height: 3 },
                              shadowOpacity: 0.12,
                              shadowRadius: 8,
                              elevation: 2,
                            }
                          : {}),
                      }}
                    >
                      <IconBadge icon={p.icon} tint={p.tint} size={42} />
                      <View className="flex-1">
                        <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{p.name}</Text>
                        <Text style={{ fontSize: 13.5, lineHeight: 19, color: c.slate, marginTop: 2 }}>
                          {p.summary}
                        </Text>
                      </View>

                      {isDone ? (
                        <View
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 13,
                            backgroundColor: "#ECFDF5",
                            borderWidth: 1,
                            borderColor: "#A7F3D0",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Feather name="check" size={15} color="#059669" />
                        </View>
                      ) : isNext ? (
                        <View
                          style={{
                            paddingHorizontal: 9,
                            paddingVertical: 3.5,
                            borderRadius: 999,
                            backgroundColor: c.tint,
                            borderWidth: 1,
                            borderColor: "#DBEAFE",
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "700", color: c.primary }}>
                            Up next
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Feather name="clock" size={13} color={c.steel} />
                          <Text style={{ fontSize: 12, fontWeight: "500", color: c.steel }}>~1 min</Text>
                        </View>
                      )}
                    </AnimatedButton>
                  </Animated.View>
                );
              })}
            </View>

            <View style={{ marginTop: 22 }}>
              <InfoNote
                icon="shield"
                text="Only you and HeartLink see these answers. They calibrate your starting score and baseline habits."
              />
            </View>
          </>
        )}
      </DsScreen>
      <FinishLaterDialog visible={finishLater} onClose={() => setFinishLater(false)} />
    </>
  );
}
