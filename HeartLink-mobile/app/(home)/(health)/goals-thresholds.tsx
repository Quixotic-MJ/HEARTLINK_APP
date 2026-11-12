import React, { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { apiFetch } from "../../../lib/api";
import { useDs } from "../../../components/onboarding/useDs";
import DsButton from "../../../components/onboarding/DsButton";
import { DsScreen, InfoNote } from "../../../components/onboarding/QuestionLayout";
import { PageHeader } from "../../../components/family/FamilyBits";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Skeleton } from "../../../components/ui/Skeleton";
import { DailyTargets, LIMITS_NOTE, MOVEMENT_GOAL, clampGoal, limitRows } from "../../../services/dailyLimits";

// HL-016 / HL-017, HL-156: Settings › Health targets and limits. The daily limits are read-only: they come from the
// guidelines (the Cardiologist asked for strict sodium and cholesterol limits), and only the care team can set a stricter
// one. The patient sets their daily movement goal, which the Dashboard and Trends use.

type Analytics = { targets?: DailyTargets | null; thresholds?: { active_minutes_goal?: number | null } | null };

function LimitsCard({ targets }: { targets: DailyTargets }) {
  const { c } = useDs();
  const rows = limitRows(targets);
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}>
      {rows.map((r, i) => (
        <View key={r.label} style={{ padding: 16, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.hairlineSoft }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{r.label}</Text>
            <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{`${r.value} a day`}</Text>
          </View>
          <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate, marginTop: 4 }}>{r.target.why}</Text>
          <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.steel, marginTop: 4 }}>{r.target.source}</Text>
        </View>
      ))}
    </View>
  );
}

function GoalStepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const { c } = useDs();
  const button = (icon: "minus" | "plus", to: number, disabled: boolean, label: string) => (
    <AnimatedButton
      onPress={() => {
        Haptics.selectionAsync();
        onChange(clampGoal(to));
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 48,
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: c.hairlineStrong,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Feather name={icon} size={18} color={c.ink} />
    </AnimatedButton>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      {button("minus", value - MOVEMENT_GOAL.step, value <= MOVEMENT_GOAL.min, "Lower the goal by 5 minutes")}
      <Text accessibilityLiveRegion="polite" style={{ minWidth: 110, textAlign: "center", fontSize: 20, fontWeight: "600", color: c.ink }}>
        {`${value} min`}
      </Text>
      {button("plus", value + MOVEMENT_GOAL.step, value >= MOVEMENT_GOAL.max, "Raise the goal by 5 minutes")}
    </View>
  );
}

export default function GoalsThresholdsScreen() {
  const { c } = useDs();
  const router = useRouter();
  const { showToast } = useToast();
  const { userId } = useUser();
  const queryClient = useQueryClient();
  // The saved goal, until the patient changes it here
  const [edited, setEdited] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const data = useQuery({
    queryKey: ["healthTargets", userId],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async (): Promise<Analytics> => {
      const res = await apiFetch(`/api/analytics/${userId}`);
      if (!res.ok) throw new Error("Couldn't load your limits");
      return res.json();
    },
  });
  const savedGoal = clampGoal(Number(data.data?.thresholds?.active_minutes_goal) || MOVEMENT_GOAL.fallback);
  const goal = edited ?? savedGoal;

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/analytics/${userId}/thresholds`, {
        method: "PUT",
        body: JSON.stringify({ active_minutes_goal: goal }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(typeof body?.detail === "string" ? body.detail : "Please try again.");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({ title: "Movement goal saved", message: `${goal} active minutes a day`, type: "success" });
      await queryClient.invalidateQueries({ queryKey: ["healthTargets", userId] });
      setEdited(null);
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
    } catch (e) {
      showToast({ title: "Couldn't save your goal", message: e instanceof Error ? e.message : "Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const targets = data.data?.targets;
  const footer = data.data ? (
    <DsButton label="Save movement goal" onPress={save} loading={saving} disabled={goal === savedGoal} block />
  ) : null;

  return (
    <DsScreen header={<PageHeader title="Health targets and limits" onBack={() => router.back()} />} footer={footer}>
      <Text style={{ fontSize: 15, lineHeight: 23, color: c.slate }}>
        Your daily limits come from heart-health guidelines. HeartLink uses them to check your meals and suggest recipes.
      </Text>

      {data.isPending ? (
        <View style={{ gap: 12, marginTop: 22 }}>
          <Skeleton style={{ height: 320, borderRadius: 12 }} />
          <Skeleton style={{ height: 120, borderRadius: 12 }} />
        </View>
      ) : data.isError || !data.data ? (
        <View style={{ gap: 12, marginTop: 22 }}>
          <InfoNote icon="wifi-off" title="Your limits couldn't load" text="Check your connection, then try again." />
          <DsButton label="Try again" variant="secondary" onPress={() => data.refetch()} block />
        </View>
      ) : (
        <View style={{ gap: 24, marginTop: 22 }}>
          {targets ? (
            <View>
              <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: c.ink, marginBottom: 10 }}>
                Your daily limits
              </Text>
              <LimitsCard targets={targets} />
              {targets.bmi ? (
                <Text style={{ fontSize: 13, color: c.steel, marginTop: 10 }}>
                  {`Worked out from your latest weight and height (BMI ${targets.bmi}${targets.bmi_category ? `, ${targets.bmi_category}` : ""}).`}
                </Text>
              ) : null}
            </View>
          ) : null}

          <InfoNote icon="shield" text={LIMITS_NOTE} />

          <View>
            <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: c.ink }}>
              Daily movement goal
            </Text>
            <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate, marginTop: 4, marginBottom: 14 }}>
              Active minutes you aim for each day. The Dashboard and Trends show your progress toward it.
            </Text>
            <GoalStepper value={goal} onChange={setEdited} />
          </View>
        </View>
      )}
    </DsScreen>
  );
}
