import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import AnimatedButton from "../../components/ui/AnimatedButton";
import DsButton from "../../components/onboarding/DsButton";
import SetupHeader from "../../components/onboarding/SetupHeader";
import FinishLaterDialog from "../../components/onboarding/FinishLaterDialog";
import GetHelpNote from "../../components/onboarding/GetHelpNote";
import { CheckList } from "../../components/onboarding/Controls";
import { DsScreen, IconBadge } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";
import { useBaseline } from "../../contexts/BaselineContext";
import { useUser } from "../../contexts/UserContext";
import { HEALTH_CONDITIONS, NO_CONDITION, conditionsSentence } from "../../services/setupScreening";

const OPTIONS = [...HEALTH_CONDITIONS, { value: NO_CONDITION, label: "None of these" }];

/**
 * HL-164 (panel revision): before setup, the conditions HeartLink isn't made for. A tick shows the advice not to use the
 * app: the person can sign out, or go on only after saying their doctor OK'd it.
 */
export default function HealthCheckScreen() {
  const router = useRouter();
  const { c } = useDs();
  const { logout } = useUser();
  const { data, updateData } = useBaseline();
  const [picked, setPicked] = useState<string[]>(
    data.health_check_done ? (data.health_conditions.length ? data.health_conditions : [NO_CONDITION]) : []
  );
  const [advice, setAdvice] = useState(false);
  const [cleared, setCleared] = useState(data.doctor_cleared);
  const [finishLater, setFinishLater] = useState(false);

  const conditions = picked.filter((p) => p !== NO_CONDITION);

  const toggle = (v: string) => {
    if (v === NO_CONDITION) {
      setPicked(picked.includes(NO_CONDITION) ? [] : [NO_CONDITION]);
      return;
    }
    const rest = picked.filter((p) => p !== NO_CONDITION);
    setPicked(rest.includes(v) ? rest.filter((p) => p !== v) : [...rest, v]);
  };

  const goOn = (doctorCleared: boolean) => {
    updateData({ health_check_done: true, health_conditions: conditions, doctor_cleared: doctorCleared });
    router.replace("/(baseline)/plan");
  };

  const signOut = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  const header = (
    <SetupHeader
      title="Before we start · Health check"
      onBack={() => (advice ? setAdvice(false) : router.replace("/(baseline)/start"))}
      onFinishLater={() => setFinishLater(true)}
    />
  );

  return (
    <>
      {advice ? (
        <DsScreen
          header={header}
          footer={
            <View style={{ gap: 10 }}>
              <DsButton label="Sign out" onPress={signOut} />
              <DsButton
                label="Continue with my doctor's OK"
                variant="secondary"
                block
                disabled={!cleared}
                // The secondary style doesn't change when it's off, so dim it until the box is ticked
                style={{ opacity: cleared ? 1 : 0.45 }}
                onPress={() => goOn(true)}
              />
            </View>
          }
        >
          <Animated.View entering={FadeIn.duration(300)} style={{ gap: 16 }}>
            <IconBadge icon="hand-back-left-outline" tint="peach" />
            <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 33, fontWeight: "700", letterSpacing: -0.5, color: c.ink }}>
              HeartLink isn&apos;t made for your condition
            </Text>
            <Text style={{ fontSize: 15.5, lineHeight: 23, color: c.charcoal }}>
              {conditionsSentence(conditions)} HeartLink&apos;s blood pressure targets, exercise and food suggestions are made
              for people without these conditions. Without your doctor&apos;s guidance they could be wrong for you and could
              make your condition worse.
            </Text>
            <Text style={{ fontSize: 15.5, lineHeight: 23, fontWeight: "700", color: c.ink }}>
              We advise you not to use HeartLink unless your doctor says it&apos;s OK.
            </Text>
            <GetHelpNote />
            <AnimatedButton
              onPress={() => setCleared((v) => !v)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: cleared }}
              accessibilityLabel="My doctor said I can use HeartLink"
              style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingVertical: 4 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: cleared ? c.primary : "transparent",
                  borderWidth: cleared ? 0 : 1.5,
                  borderColor: c.hairlineStrong,
                }}
              >
                {cleared ? <Feather name="check" size={14} color="#ffffff" /> : null}
              </View>
              <Text style={{ flex: 1, fontSize: 14.5, lineHeight: 21, color: c.ink }}>My doctor said I can use HeartLink</Text>
            </AnimatedButton>
            <AnimatedButton
              onPress={() => setAdvice(false)}
              accessibilityRole="button"
              style={{ alignSelf: "flex-start", minHeight: 44, justifyContent: "center" }}
            >
              <Text style={{ fontSize: 14.5, fontWeight: "600", color: c.primary }}>Change my answer</Text>
            </AnimatedButton>
          </Animated.View>
        </DsScreen>
      ) : (
        <DsScreen
          header={header}
          footer={
            <Animated.View entering={FadeInDown.delay(150).duration(350)}>
              <DsButton
                label="Continue"
                disabled={picked.length === 0}
                onPress={() => (conditions.length === 0 ? goOn(false) : setAdvice(true))}
                icon={<Feather name="arrow-right" size={16} color={picked.length === 0 ? c.steel : "#FFFFFF"} />}
              />
            </Animated.View>
          }
        >
          <Animated.View entering={FadeIn.duration(350)} style={{ gap: 16 }}>
            <IconBadge icon="stethoscope" tint="sky" />
            <View style={{ gap: 6 }}>
              <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 33, fontWeight: "700", letterSpacing: -0.5, color: c.ink }}>
                Has a doctor told you that you have any of these?
              </Text>
              <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>
                HeartLink isn&apos;t made for these conditions. Tick all that apply.
              </Text>
            </View>
            <CheckList options={OPTIONS} selected={picked} onToggle={toggle} accessibilityLabel="Conditions" />
          </Animated.View>
        </DsScreen>
      )}
      <FinishLaterDialog visible={finishLater} onClose={() => setFinishLater(false)} />
    </>
  );
}
