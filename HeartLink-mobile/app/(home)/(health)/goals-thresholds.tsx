import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { apiFetch } from "../../../lib/api";
import { useDs } from "../../../components/onboarding/useDs";
import { DsTextField } from "../../../components/onboarding/Controls";
import DsButton from "../../../components/onboarding/DsButton";
import { BadgeTint, IconBadge, McIcon, Tag } from "../../../components/onboarding/QuestionLayout";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";

/** HL-016 / HL-017: one daily limit worked out by the backend (services/nutrition_targets.py). */
type DailyTarget = { value: number; source: string; why: string };
type DailyTargets = {
  bmi: number | null;
  bmi_category: string | null;
  calories: DailyTarget;
  sat_fat_g: DailyTarget;
  cholesterol_mg: DailyTarget;
  sodium_mg: DailyTarget;
};

/** The guideline-based food limits, each with a short "Why this number" line and its source. */
function DailyLimitsCard({ targets }: { targets: DailyTargets }) {
  const { c } = useDs();
  const rows: { label: string; unit: string; target: DailyTarget }[] = [
    { label: "Calories", unit: "kcal", target: targets.calories },
    { label: "Saturated fat", unit: "g", target: targets.sat_fat_g },
    { label: "Cholesterol", unit: "mg", target: targets.cholesterol_mg },
    { label: "Sodium", unit: "mg", target: targets.sodium_mg },
  ];
  return (
    <View className="mb-4" style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas, padding: 20, gap: 14 }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>Your daily food limits</Text>
          <Text style={{ fontSize: 13, color: c.slate, marginTop: 2 }}>From your height, weight, age and activity</Text>
        </View>
        <IconBadge icon="food-apple-outline" tint="peach" size={40} />
      </View>
      {targets.bmi != null && targets.bmi_category ? (
        <View className="flex-row items-center" style={{ gap: 8 }} accessible accessibilityLabel={`BMI ${targets.bmi}, ${targets.bmi_category} on the Asia-Pacific scale`}>
          <Tag label={`BMI ${targets.bmi} · ${targets.bmi_category}`} tone="neutral" />
          <Text style={{ fontSize: 12, color: c.steel }}>Asia-Pacific scale</Text>
        </View>
      ) : null}
      {rows.map(({ label, unit, target }, i) => (
        <View
          key={label}
          style={{ gap: 4, paddingTop: i === 0 ? 0 : 14, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.hairlineSoft }}
          accessible
          accessibilityLabel={`${label}: ${target.value.toLocaleString()} ${unit} a day. Why this number: ${target.why} Source: ${target.source}`}
        >
          <View className="flex-row items-baseline justify-between">
            <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink }}>{label}</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink, fontVariant: ["tabular-nums"] }}>
              {target.value.toLocaleString()} {unit}
            </Text>
          </View>
          <Text style={{ fontSize: 13, lineHeight: 19, color: c.slate }}>Why this number: {target.why}</Text>
          <Text style={{ fontSize: 12, color: c.steel }}>Source: {target.source}</Text>
        </View>
      ))}
      <View className="flex-row items-start pr-2">
        <Feather name="info" size={14} color={c.steel} style={{ marginTop: 2, marginRight: 6 }} />
        <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: c.slate }}>
          Based on published heart-health guidelines and still being reviewed by our cardiologist and dietitian. They
          update when your weight changes. If your doctor gave you different numbers, follow your doctor.
        </Text>
      </View>
    </View>
  );
}

/** One target: title, short line, a topic badge, the field(s), then a grey note. */
function TargetCard({ title, subtitle, icon, tint, note, children }: { title: string; subtitle: string; icon: McIcon; tint: BadgeTint; note: string; children: React.ReactNode }) {
  const { c } = useDs();
  return (
    <View className="mb-4" style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas, padding: 20, gap: 14 }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>{title}</Text>
          <Text style={{ fontSize: 13, color: c.slate, marginTop: 2 }}>{subtitle}</Text>
        </View>
        <IconBadge icon={icon} tint={tint} size={40} />
      </View>
      {children}
      <View className="flex-row items-start pr-2">
        <Feather name="info" size={14} color={c.steel} style={{ marginTop: 2, marginRight: 6 }} />
        <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: c.slate }}>{note}</Text>
      </View>
    </View>
  );
}

export default function GoalsThresholdsScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  
  const { userId, token } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sodium, setSodium] = useState("1500");
  const [fluidLimit, setFluidLimit] = useState("2000");
  const [activeMins, setActiveMins] = useState("30");
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");
  const [targets, setTargets] = useState<DailyTargets | null>(null);

  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const effectiveToken = token || "";
        const response = await apiFetch(`/api/analytics/${userId}`, {
          headers: {
            "Authorization": `Bearer ${effectiveToken}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        const result = await response.json();
        if (result.thresholds) {
          const t = result.thresholds;
          setSodium(t.sodium_limit_mg.toString());
          if (t.fluid_limit_ml) setFluidLimit(t.fluid_limit_ml.toString());
          setActiveMins(t.active_minutes_goal.toString());
          setSystolic(t.systolic_threshold.toString());
          setDiastolic(t.diastolic_threshold.toString());
        }
        if (result.targets) setTargets(result.targets);
      } catch (e) {
        console.error("Failed to load targets & limits:", e);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchThresholds();
  }, [userId, token]);

  const handleSave = async () => {
    const sod = parseInt(sodium, 10) || 0;
    const act = parseInt(activeMins, 10) || 0;
    const sys = parseInt(systolic, 10) || 0;
    const dia = parseInt(diastolic, 10) || 0;
    const fl = parseInt(fluidLimit, 10) || 0;

    // Validation
    if (sod < 500 || sod > 5000) return showToast({ title: "Invalid Sodium", message: "Sodium limit must be between 500mg and 5,000mg.", type: "error" });
    if (act < 0 || act > 300) return showToast({ title: "Invalid Activity", message: "Movement goal must be between 0 and 300 active minutes.", type: "error" });
    if (sys < 80 || sys > 200) return showToast({ title: "Invalid Systolic", message: "Systolic target must be between 80 and 200 mmHg.", type: "error" });
    if (dia < 40 || dia > 130) return showToast({ title: "Invalid Diastolic", message: "Diastolic target must be between 40 and 130 mmHg.", type: "error" });
    if (fl < 500 || fl > 5000) return showToast({ title: "Invalid Fluid Limit", message: "Fluid limit must be between 500ml and 5,000ml.", type: "error" });

    setSaving(true);
    try {
      const effectiveToken = token || "";
      const response = await apiFetch(`/api/analytics/${userId}/thresholds`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveToken}`,
        },
        body: JSON.stringify({
          sodium_limit_mg: sod,
          fluid_limit_ml: fl,
          active_minutes_goal: act,
          systolic_threshold: sys,
          diastolic_threshold: dia,
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        showToast({ title: "Targets Saved", message: "Your health targets and daily limits have been updated.", type: "success" });
        router.back();
      } else {
        showToast({ title: "Save Failed", message: result.detail || "Could not save health targets.", type: "error" });
      }
    } catch (e) {
      console.error(e);
      showToast({ title: "Network Error", message: "Failed to connect to server. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: c.canvas }}>
        <ActivityIndicator size="large" color={c.line} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-3" style={{ gap: 12, borderBottomWidth: 1, borderBottomColor: c.hairline }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 20, fontWeight: "600", color: c.ink }} numberOfLines={1}>
          Health Targets & Limits
        </Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerClassName="p-5 pb-36" showsVerticalScrollIndicator={false}>
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate, marginBottom: 24 }}>
            Customize your daily lifestyle targets and clinical limits. These numbers help calibrate your daily stability analysis.
          </Text>

          {targets ? <DailyLimitsCard targets={targets} /> : null}

          {/* ── 1. Sodium Intake Limit ── */}
          <TargetCard
            title="Sodium Intake Limit"
            subtitle="Daily maximum sodium budget"
            icon="silverware-fork-knife"
            tint="peach"
            note="The American Heart Association's ideal limit is 1,500 mg a day for healthy blood pressure. Change it only if your doctor gave you a different number."
          >
            <DsTextField hideLabel label="Sodium Intake Limit" unit="mg / day" placeholder="1500" keyboardType="numeric" value={sodium} onChangeText={setSodium} />
          </TargetCard>

          {/* ── 2. Daily Fluid Limit ── */}
          <TargetCard
            title="Daily Fluid Limit"
            subtitle="Daily fluid intake restriction"
            icon="water-outline"
            tint="sky"
            note="Fluid restriction helps prevent fluid buildup and manages symptoms in cardiovascular care."
          >
            <DsTextField hideLabel label="Daily Fluid Limit" unit="ml / day" placeholder="2000" keyboardType="numeric" value={fluidLimit} onChangeText={setFluidLimit} />
          </TargetCard>

          {/* ── 3. Daily Movement Goal ── */}
          <TargetCard
            title="Daily Movement Goal"
            subtitle="Active physical exercise minutes"
            icon="walk"
            tint="mint"
            note="Target minutes of daily activity including walking, light exercise, and heart-safe rehab routines."
          >
            <DsTextField hideLabel label="Daily Movement Goal" unit="mins / day" placeholder="30" keyboardType="numeric" value={activeMins} onChangeText={setActiveMins} />
          </TargetCard>

          {/* ── 4. Target Blood Pressure ── */}
          <TargetCard
            title="Target Blood Pressure"
            subtitle="Personal blood pressure target"
            icon="heart-pulse"
            tint="rose"
            note="Set the target recommended by your doctor or care provider. Typical healthy resting blood pressure is around 120/80 mmHg."
          >
            <View className="flex-row items-end gap-3">
              <View className="flex-1">
                <DsTextField label="Systolic (mmHg)" placeholder="120" keyboardType="numeric" value={systolic} onChangeText={setSystolic} />
              </View>
              <Text style={{ fontSize: 22, color: c.muted, marginBottom: 12 }}>/</Text>
              <View className="flex-1">
                <DsTextField label="Diastolic (mmHg)" placeholder="80" keyboardType="numeric" value={diastolic} onChangeText={setDiastolic} />
              </View>
            </View>
          </TargetCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Action Footer */}
      <View 
        className="px-5 pt-3.5 absolute bottom-0 w-full"
        style={{ paddingBottom: Math.max(insets.bottom, 16), backgroundColor: c.canvas, borderTopWidth: 1, borderTopColor: c.hairline }}
      >
        <DsButton
          label="Save Targets & Limits"
          onPress={handleSave}
          loading={saving}
          accessibilityHint="Saves your health targets and limits"
        />
      </View>
    </SafeAreaView>
  );
}
