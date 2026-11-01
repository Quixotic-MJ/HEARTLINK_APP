import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { apiFetch } from "../../../lib/api";
import { useDs } from "../../../components/onboarding/useDs";
import { DsTextField } from "../../../components/onboarding/Controls";
import { ScreenWrapper } from "../../../components/ui/ScreenWrapper";
import AnimatedButton from "../../../components/ui/AnimatedButton";
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

// ─── Daily Limits Card ────────────────────────────────────────────────────────

function DailyLimitsCard({ targets }: { targets: DailyTargets }) {
  const { c, isDark } = useDs();
  const rows: { label: string; unit: string; target: DailyTarget }[] = [
    { label: "Calories", unit: "kcal", target: targets.calories },
    { label: "Saturated fat", unit: "g", target: targets.sat_fat_g },
    { label: "Cholesterol", unit: "mg", target: targets.cholesterol_mg },
    { label: "Sodium", unit: "mg", target: targets.sodium_mg },
  ];

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#EEF2F6",
        backgroundColor: isDark ? c.surface : "#FFFFFF",
        padding: 18,
        gap: 14,
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.04,
            shadowRadius: 6,
          },
          android: { elevation: 1 },
        }),
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 16.5, fontWeight: "700", color: c.ink, letterSpacing: -0.2 }}>
            Your Daily Food Limits
          </Text>
          <Text style={{ fontSize: 13, color: c.slate, marginTop: 2 }}>
            From your height, weight, age, and activity
          </Text>
        </View>

        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: isDark ? "rgba(249, 115, 22, 0.18)" : "#FFF7ED",
            borderWidth: 1,
            borderColor: isDark ? "rgba(249, 115, 22, 0.32)" : "#FED7AA",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons
            name="food-apple-outline"
            size={22}
            color={isDark ? "#FB923C" : "#EA580C"}
          />
        </View>
      </View>

      {/* BMI Pill */}
      {targets.bmi != null && targets.bmi_category ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            alignSelf: "flex-start",
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: isDark ? c.surfaceAlt : "#F1F5F9",
            borderWidth: 1,
            borderColor: isDark ? c.hairline : "#E2E8F0",
          }}
          accessible
          accessibilityLabel={`BMI ${targets.bmi}, ${targets.bmi_category} on the Asia-Pacific scale`}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: c.ink }}>
            BMI {targets.bmi} · {targets.bmi_category}
          </Text>
          <Text style={{ fontSize: 11, color: c.steel }}>Asia-Pacific scale</Text>
        </View>
      ) : null}

      {/* Rows */}
      {rows.map(({ label, unit, target }, i) => (
        <View
          key={label}
          style={{
            gap: 3,
            paddingTop: i === 0 ? 4 : 12,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: isDark ? c.hairlineSoft : "#F1F5F9",
          }}
          accessible
          accessibilityLabel={`${label}: ${target.value.toLocaleString()} ${unit} a day. Why this number: ${target.why}. Source: ${target.source}`}
        >
          <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14.5, fontWeight: "600", color: c.ink }}>{label}</Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: isDark ? "#38BDF8" : "#0284C7",
                fontVariant: ["tabular-nums"],
              }}
            >
              {target.value.toLocaleString()} {unit}
            </Text>
          </View>
          <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.slate }}>
            Why: {target.why}
          </Text>
          <Text style={{ fontSize: 11.5, color: c.steel }}>
            Source: {target.source}
          </Text>
        </View>
      ))}

      {/* Bottom Advisory */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 8,
          padding: 10,
          borderRadius: 12,
          backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
        }}
      >
        <Feather name="info" size={13} color={c.steel} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: c.steel }}>
          Based on published heart-health guidelines. If your cardiologist gave you specific limits, always follow your doctor.
        </Text>
      </View>
    </View>
  );
}

// ─── Target Setting Card ──────────────────────────────────────────────────────

function TargetCard({
  title,
  subtitle,
  icon,
  tint,
  note,
  children,
}: {
  title: string;
  subtitle: string;
  icon: string;
  tint: "peach" | "sky" | "mint" | "rose";
  note: string;
  children: React.ReactNode;
}) {
  const { c, isDark } = useDs();

  const getTintConfig = (t: string) => {
    switch (t) {
      case "peach":
        return {
          bg: isDark ? "rgba(249, 115, 22, 0.18)" : "#FFF7ED",
          border: isDark ? "rgba(249, 115, 22, 0.32)" : "#FED7AA",
          fg: isDark ? "#FB923C" : "#EA580C",
        };
      case "mint":
        return {
          bg: isDark ? "rgba(16, 185, 129, 0.18)" : "#ECFDF5",
          border: isDark ? "rgba(16, 185, 129, 0.32)" : "#A7F3D0",
          fg: isDark ? "#34D399" : "#059669",
        };
      case "rose":
        return {
          bg: isDark ? "rgba(225, 29, 72, 0.18)" : "#FFF1F2",
          border: isDark ? "rgba(225, 29, 72, 0.32)" : "#FECDD3",
          fg: isDark ? "#FB7185" : "#E11D48",
        };
      case "sky":
      default:
        return {
          bg: isDark ? "rgba(2, 132, 199, 0.18)" : "#F0F9FF",
          border: isDark ? "rgba(2, 132, 199, 0.32)" : "#BAE6FD",
          fg: isDark ? "#38BDF8" : "#0284C7",
        };
    }
  };

  const colors = getTintConfig(tint);

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#EEF2F6",
        backgroundColor: isDark ? c.surface : "#FFFFFF",
        padding: 18,
        gap: 14,
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.04,
            shadowRadius: 6,
          },
          android: { elevation: 1 },
        }),
      }}
    >
      {/* Card Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontSize: 16.5, fontWeight: "700", color: c.ink, letterSpacing: -0.2 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: c.slate, marginTop: 2 }}>{subtitle}</Text>
        </View>

        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={icon as any} size={22} color={colors.fg} />
        </View>
      </View>

      {/* Input area */}
      {children}

      {/* Card Footer note */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 8,
          padding: 10,
          borderRadius: 12,
          backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
        }}
      >
        <Feather name="info" size={13} color={c.steel} style={{ marginTop: 2 }} />
        <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: c.steel }}>{note}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

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
    let isActive = true;
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
        if (isActive) {
          if (result.thresholds) {
            const t = result.thresholds;
            setSodium(t.sodium_limit_mg.toString());
            if (t.fluid_limit_ml) setFluidLimit(t.fluid_limit_ml.toString());
            setActiveMins(t.active_minutes_goal.toString());
            setSystolic(t.systolic_threshold.toString());
            setDiastolic(t.diastolic_threshold.toString());
          }
          if (result.targets) setTargets(result.targets);
        }
      } catch (e) {
        console.error("Failed to load targets & limits:", e);
      } finally {
        if (isActive) setLoading(false);
      }
    };
    if (userId) fetchThresholds();
    return () => {
      isActive = false;
    };
  }, [userId, token]);

  const handleSave = async () => {
    const sod = parseInt(sodium, 10) || 0;
    const act = parseInt(activeMins, 10) || 0;
    const sys = parseInt(systolic, 10) || 0;
    const dia = parseInt(diastolic, 10) || 0;
    const fl = parseInt(fluidLimit, 10) || 0;

    // Validation
    if (sod < 500 || sod > 5000) {
      return showToast({
        title: "Invalid Sodium",
        message: "Sodium limit must be between 500mg and 5,000mg.",
        type: "error",
      });
    }
    if (act < 0 || act > 300) {
      return showToast({
        title: "Invalid Activity",
        message: "Movement goal must be between 0 and 300 active minutes.",
        type: "error",
      });
    }
    if (sys < 80 || sys > 200) {
      return showToast({
        title: "Invalid Systolic",
        message: "Systolic target must be between 80 and 200 mmHg.",
        type: "error",
      });
    }
    if (dia < 40 || dia > 130) {
      return showToast({
        title: "Invalid Diastolic",
        message: "Diastolic target must be between 40 and 130 mmHg.",
        type: "error",
      });
    }
    if (fl < 500 || fl > 5000) {
      return showToast({
        title: "Invalid Fluid Limit",
        message: "Fluid limit must be between 500ml and 5,000ml.",
        type: "error",
      });
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showToast({
          title: "Targets Saved",
          message: "Your health targets and daily limits have been updated.",
          type: "success",
        });
        router.back();
      } else {
        showToast({
          title: "Save Failed",
          message: result.detail || "Could not save health targets.",
          type: "error",
        });
      }
    } catch (e) {
      console.error(e);
      showToast({
        title: "Network Error",
        message: "Failed to connect to server. Please try again.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={c.line} />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper edges={["top"]} withScrollView={false} safeAreaClassName="flex-1 bg-ds-canvas">
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Top Header Bar ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? c.hairline : "#EEF2F6",
          backgroundColor: isDark ? c.canvas : "#FFFFFF",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 8 }}>
          <SquareIconButton
            icon="arrow-left"
            label="Back to Settings"
            onPress={() => router.back()}
          />
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontSize: 18,
              fontWeight: "700",
              letterSpacing: -0.4,
              color: c.ink,
              flexShrink: 1,
            }}
          >
            Targets & Limits
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingVertical: 5,
            paddingHorizontal: 9,
            borderRadius: 999,
            backgroundColor: isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5",
            borderWidth: 1,
            borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0",
          }}
        >
          <Feather name="crosshair" size={13} color={isDark ? "#34D399" : "#059669"} />
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: "700",
              color: isDark ? "#34D399" : "#059669",
              letterSpacing: 0.3,
            }}
          >
            TARGETS
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 40,
            gap: 18,
          }}
        >
          {/* Intro Description & Clinical Advisory */}
          <View style={{ gap: 10 }}>
            <Text
              style={{
                fontSize: 14.5,
                lineHeight: 22,
                color: c.slate,
              }}
            >
              Customize your lifestyle goals and clinical thresholds. These numbers calibrate your daily stability score, habit rings, and safety alerts.
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: isDark ? "rgba(14, 165, 233, 0.1)" : "#F0F9FF",
                borderWidth: 1,
                borderColor: isDark ? "rgba(14, 165, 233, 0.25)" : "#BAE6FD",
              }}
            >
              <Feather name="shield" size={14} color={isDark ? "#38BDF8" : "#0284C7"} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 12.5,
                  lineHeight: 17,
                  color: isDark ? "#BAE6FD" : "#0369A1",
                  fontWeight: "500",
                }}
              >
                Always consult your doctor before modifying clinical targets.
              </Text>
            </View>
          </View>

          {/* Guidelines-Based Daily Food Limits */}
          {targets ? <DailyLimitsCard targets={targets} /> : null}

          {/* ── 1. Sodium Intake Limit ── */}
          <TargetCard
            title="Sodium Intake Limit"
            subtitle="Daily maximum sodium budget"
            icon="silverware-fork-knife"
            tint="peach"
            note="The American Heart Association's recommended target is 1,500 mg a day. Modify only if your doctor instructed otherwise."
          >
            <DsTextField
              hideLabel
              label="Sodium Intake Limit"
              unit="mg / day"
              placeholder="1500"
              keyboardType="numeric"
              value={sodium}
              onChangeText={setSodium}
            />
          </TargetCard>

          {/* ── 2. Daily Fluid Limit ── */}
          <TargetCard
            title="Daily Fluid Limit"
            subtitle="Daily fluid intake restriction"
            icon="water-outline"
            tint="sky"
            note="Fluid restriction prevents excessive circulatory volume and mitigates strain in cardiac management."
          >
            <DsTextField
              hideLabel
              label="Daily Fluid Limit"
              unit="ml / day"
              placeholder="2000"
              keyboardType="numeric"
              value={fluidLimit}
              onChangeText={setFluidLimit}
            />
          </TargetCard>

          {/* ── 3. Daily Movement Goal ── */}
          <TargetCard
            title="Daily Movement Goal"
            subtitle="Active physical exercise minutes"
            icon="walk"
            tint="mint"
            note="Target minutes of daily activity including walking, light rehab routines, and cardio exercises."
          >
            <DsTextField
              hideLabel
              label="Daily Movement Goal"
              unit="mins / day"
              placeholder="30"
              keyboardType="numeric"
              value={activeMins}
              onChangeText={setActiveMins}
            />
          </TargetCard>

          {/* ── 4. Target Blood Pressure ── */}
          <TargetCard
            title="Target Blood Pressure"
            subtitle="Personal blood pressure target"
            icon="heart-pulse"
            tint="rose"
            note="Set the target advised by your care team. Standard healthy resting blood pressure is around 120/80 mmHg."
          >
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <DsTextField
                  label="Systolic (mmHg)"
                  placeholder="120"
                  keyboardType="numeric"
                  value={systolic}
                  onChangeText={setSystolic}
                />
              </View>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "600",
                  color: c.steel,
                  marginBottom: 12,
                }}
              >
                /
              </Text>
              <View style={{ flex: 1 }}>
                <DsTextField
                  label="Diastolic (mmHg)"
                  placeholder="80"
                  keyboardType="numeric"
                  value={diastolic}
                  onChangeText={setDiastolic}
                />
              </View>
            </View>
          </TargetCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Fixed Bottom Action Bar ── */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 16),
          borderTopWidth: 1,
          borderTopColor: isDark ? c.hairline : "#EEF2F6",
          backgroundColor: isDark ? c.canvas : "#FFFFFF",
          ...Platform.select({
            ios: {
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: isDark ? 0.25 : 0.06,
              shadowRadius: 10,
            },
            android: { elevation: 6 },
          }),
        }}
      >
        <AnimatedButton
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save Targets and Limits"
          style={{
            height: 48,
            borderRadius: 14,
            backgroundColor: isDark ? "#0284C7" : "#0284C7",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#FFFFFF" }}>
            {saving ? "Saving Changes..." : "Save Targets & Limits"}
          </Text>
        </AnimatedButton>
      </View>
    </ScreenWrapper>
  );
}
