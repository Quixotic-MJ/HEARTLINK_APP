import React, { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../../lib/api";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken } from "../../../lib/secureTokenStore";
import { useUser } from "../../../contexts/UserContext";
import { markWeeklyReportOpened } from "../../../services/weeklyReport";
import { useDs } from "../../../components/onboarding/useDs";
import { InfoNote } from "../../../components/onboarding/QuestionLayout";
import DsButton from "../../../components/onboarding/DsButton";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { ds } from "../../../constants/theme";

let isCurrentlySharing = false;

// Report colours (the PDF is always light).
const P = ds.light;

// ─── Skeletons ────────────────────────────────────────────────────────────────
function SkeletonPulse({ style, className }: any) {
  const [anim] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  return (
    <Animated.View
      style={[{ opacity: anim }, style]}
      className={`bg-ds-surface-alt ${className}`}
    />
  );
}

function WrapUpSkeleton() {
  return (
    <View className="px-5 pt-6 gap-5">
      <View className="gap-2">
        <SkeletonPulse className="w-36 h-4 rounded-md" />
        <SkeletonPulse className="w-56 h-8 rounded-md" />
        <SkeletonPulse className="w-full h-36 rounded-2xl mt-2" />
      </View>
      <View className="flex-row gap-3">
        <SkeletonPulse className="flex-1 h-28 rounded-2xl" />
        <SkeletonPulse className="flex-1 h-28 rounded-2xl" />
      </View>
      <View className="flex-row gap-3">
        <SkeletonPulse className="flex-1 h-28 rounded-2xl" />
        <SkeletonPulse className="flex-1 h-28 rounded-2xl" />
      </View>
      <SkeletonPulse className="w-full h-44 rounded-2xl mt-2" />
    </View>
  );
}

// ─── 1. "How Did I Do?" Executive Verdict Card ────────────────────────────────
function ExecutiveVerdictCard({ data }: { data: any }) {
  const { c, isDark } = useDs();
  const hss = data?.overview?.hss_average;
  const symptomRecords = data?.symptoms?.records || [];
  const hasSymptoms = symptomRecords.length > 0;

  const avgSys = data?.vitals?.avg_systolic;
  const avgDia = data?.vitals?.avg_diastolic;
  const vitalDays = data?.vitals?.days_logged || data?.overview?.vital_days || 0;
  const activeMins = data?.movement?.total_minutes || data?.overview?.movement_minutes || 0;
  const mealCount = data?.nutrition?.meals_recorded || 0;
  const mealDays = data?.nutrition?.days_logged || data?.overview?.meal_days || 0;
  const avgSleep = data?.sleep?.avg_hours || data?.overview?.sleep_average_hours;

  // Determine clinical verdict
  let statusBadge = "STABLE • ON TRACK";
  let statusTitle = "Your Heart Health is Stable";
  let statusNarrative =
    "Your cardiovascular stability score remained consistent this week. Good activity and rest levels are keeping your cardiac load well-managed.";
  let tintColor = isDark ? "#34D399" : "#059669";
  let badgeBg = isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5";
  let badgeBorder = isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0";
  // Verified MaterialCommunityIcons glyph: shield-check
  let heroIcon: "shield-check" | "alert-circle-outline" | "alert-decagram" | "heart-pulse" = "shield-check";

  if (hss !== null && hss !== undefined && hss < 60) {
    statusBadge = "ATTENTION RECOMMENDED";
    statusTitle = "Review Recommended with Doctor";
    statusNarrative =
      "Your weekly stability score dipped into the lower range. Review your blood pressure logs and consult your doctor if symptoms persist.";
    tintColor = isDark ? "#F87171" : "#DC2626";
    badgeBg = isDark ? "rgba(239, 68, 68, 0.16)" : "#FEF2F2";
    badgeBorder = isDark ? "rgba(239, 68, 68, 0.3)" : "#FECACA";
    heroIcon = "alert-circle-outline";
  } else if (hasSymptoms) {
    statusBadge = "SYMPTOMS REPORTED";
    statusTitle = "Symptom Events Noted This Week";
    statusNarrative =
      `${symptomRecords.length} cardiac symptom event${symptomRecords.length === 1 ? "" : "s"} logged this week. These are flagged in your doctor report below.`;
    tintColor = isDark ? "#FBBF24" : "#D97706";
    badgeBg = isDark ? "rgba(245, 158, 11, 0.16)" : "#FEF3C7";
    badgeBorder = isDark ? "rgba(245, 158, 11, 0.3)" : "#FDE68A";
    heroIcon = "alert-decagram";
  } else if (hss !== null && hss !== undefined && hss < 80) {
    statusBadge = "MODERATE • ON TRACK";
    statusTitle = "Moderate Stability Rhythm";
    statusNarrative =
      "Your health score remained in the moderate range. Consistent daily blood pressure checks and light movement will help maintain stability.";
    tintColor = isDark ? "#38BDF8" : "#0284C7";
    badgeBg = isDark ? "rgba(2, 132, 199, 0.16)" : "#E0F2FE";
    badgeBorder = isDark ? "rgba(2, 132, 199, 0.3)" : "#BAE6FD";
    heroIcon = "heart-pulse";
  }

  // Actionable 3-point takeaways
  // 1. Went Well
  let wentWellText = "Logged your daily health activities this week";
  if (activeMins >= 120) {
    wentWellText = `Completed ${activeMins} min of aerobic movement (${Math.min(100, Math.round((activeMins / 150) * 100))}% of weekly goal)`;
  } else if (avgSleep && avgSleep >= 7) {
    wentWellText = `Averaged ${avgSleep}h nightly sleep for restful recovery`;
  } else if (vitalDays >= 5) {
    wentWellText = `Consistent BP tracking (${vitalDays} of 7 days logged)`;
  }

  // 2. Work On
  let workOnText = "Maintain your current daily healthy routine";
  if (avgDia && avgDia > 80) {
    workOnText = `Diastolic BP averaged ${avgDia} mmHg (target < 80 mmHg)`;
  } else if (avgSys && avgSys > 120) {
    workOnText = `Systolic BP averaged ${avgSys} mmHg (target < 120 mmHg)`;
  } else if (vitalDays < 4) {
    workOnText = `Only ${vitalDays} of 7 days BP logged (aim for daily morning checks)`;
  } else if (activeMins < 90) {
    workOnText = `Movement was ${activeMins} min (recommended target: 150 min/wk)`;
  } else if (mealDays < 3) {
    workOnText = `Only ${mealDays} days of meals tracked (log meals to watch sodium)`;
  }

  // 3. Next Step
  let nextStepText = "Check morning blood pressure before breakfast";
  if (hasSymptoms) {
    nextStepText = "Share this PDF summary with your doctor at your checkup";
  } else if (avgDia && avgDia > 80) {
    nextStepText = "Take resting BP seated each morning before medication";
  } else if (vitalDays < 5) {
    nextStepText = "Set a daily morning reminder to record BP regularly";
  } else {
    nextStepText = "Keep up regular light activity and low-sodium meals";
  }

  return (
    <View
      style={{
        borderRadius: 20,
        backgroundColor: isDark ? c.surface : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#EEF2F6",
        padding: 18,
        gap: 14,
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.3 : 0.05,
            shadowRadius: 10,
          },
          android: { elevation: 2 },
        }),
      }}
    >
      {/* Top Banner Row */}
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <View
            style={{
              alignSelf: "flex-start",
              paddingHorizontal: 9,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: badgeBg,
              borderWidth: 1,
              borderColor: badgeBorder,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: "700", color: tintColor, letterSpacing: 0.3 }}>
              {statusBadge}
            </Text>
          </View>
          <Text
            accessibilityRole="header"
            style={{
              fontSize: 19,
              fontWeight: "700",
              color: c.ink,
              letterSpacing: -0.3,
              marginTop: 2,
            }}
          >
            {statusTitle}
          </Text>
        </View>

        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            backgroundColor: badgeBg,
            borderWidth: 1,
            borderColor: badgeBorder,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={heroIcon} size={24} color={tintColor} />
        </View>
      </View>

      {/* Narrative Explanation */}
      <Text style={{ fontSize: 14, lineHeight: 21, color: c.slate }}>
        {statusNarrative}
      </Text>

      {/* Actionable 3-Point Verdict Container */}
      <View
        style={{
          borderRadius: 14,
          backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
          padding: 13,
          gap: 11,
          borderWidth: 1,
          borderColor: isDark ? c.hairline : "#EEF2F6",
        }}
      >
        {/* Went Well */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              backgroundColor: isDark ? "rgba(16, 185, 129, 0.18)" : "#ECFDF5",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            <Feather name="check" size={13} color={isDark ? "#34D399" : "#059669"} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ fontSize: 11.5, fontWeight: "700", color: isDark ? "#34D399" : "#059669", textTransform: "uppercase", letterSpacing: 0.3 }}>
              Went Well
            </Text>
            <Text style={{ fontSize: 13, lineHeight: 18, color: c.ink }}>
              {wentWellText}
            </Text>
          </View>
        </View>

        {/* Work On */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              backgroundColor: isDark ? "rgba(249, 115, 22, 0.18)" : "#FFF7ED",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            <Feather name="alert-circle" size={13} color={isDark ? "#FB923C" : "#EA580C"} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ fontSize: 11.5, fontWeight: "700", color: isDark ? "#FB923C" : "#EA580C", textTransform: "uppercase", letterSpacing: 0.3 }}>
              Work On
            </Text>
            <Text style={{ fontSize: 13, lineHeight: 18, color: c.ink }}>
              {workOnText}
            </Text>
          </View>
        </View>

        {/* Next Step */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              backgroundColor: isDark ? "rgba(2, 132, 199, 0.18)" : "#E0F2FE",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            <Feather name="arrow-right" size={13} color={isDark ? "#38BDF8" : "#0284C7"} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ fontSize: 11.5, fontWeight: "700", color: isDark ? "#38BDF8" : "#0284C7", textTransform: "uppercase", letterSpacing: 0.3 }}>
              Next Step
            </Text>
            <Text style={{ fontSize: 13, lineHeight: 18, color: c.ink }}>
              {nextStepText}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── 2. Benchmarked Metric Card ───────────────────────────────────────────────
function BenchmarkMetricCard({
  title,
  value,
  target,
  tag,
  confidenceNote,
  icon,
  iconType = "feather",
  tint = "sky",
}: {
  title: string;
  value: string;
  target: string;
  tag?: string;
  confidenceNote: string;
  icon: string;
  iconType?: "feather" | "material";
  tint?: "sky" | "mint" | "peach" | "lavender" | "rose";
}) {
  const { c, isDark } = useDs();

  const getColors = () => {
    switch (tint) {
      case "mint":
        return {
          bg: isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5",
          border: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0",
          fg: isDark ? "#34D399" : "#059669",
        };
      case "peach":
        return {
          bg: isDark ? "rgba(249, 115, 22, 0.16)" : "#FFF7ED",
          border: isDark ? "rgba(249, 115, 22, 0.3)" : "#FED7AA",
          fg: isDark ? "#FB923C" : "#EA580C",
        };
      case "lavender":
        return {
          bg: isDark ? "rgba(124, 58, 237, 0.16)" : "#F5F3FF",
          border: isDark ? "rgba(124, 58, 237, 0.3)" : "#DDD6FE",
          fg: isDark ? "#A78BFA" : "#7C3AED",
        };
      case "rose":
        return {
          bg: isDark ? "rgba(225, 29, 72, 0.16)" : "#FFF1F2",
          border: isDark ? "rgba(225, 29, 72, 0.3)" : "#FECDD3",
          fg: isDark ? "#FB7185" : "#E11D48",
        };
      case "sky":
      default:
        return {
          bg: isDark ? "rgba(2, 132, 199, 0.16)" : "#F0F9FF",
          border: isDark ? "rgba(2, 132, 199, 0.3)" : "#BAE6FD",
          fg: isDark ? "#38BDF8" : "#0284C7",
        };
    }
  };

  const colors = getColors();

  return (
    <View
      style={{
        flex: 1,
        padding: 14,
        borderRadius: 16,
        backgroundColor: isDark ? c.surface : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#EEF2F6",
        justifyContent: "space-between",
        gap: 8,
        ...Platform.select({
          ios: {
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.2 : 0.03,
            shadowRadius: 5,
          },
          android: { elevation: 1 },
        }),
      }}
    >
      {/* Top Icon & Tag */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: colors.bg,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {iconType === "material" ? (
            <MaterialCommunityIcons name={icon as any} size={20} color={colors.fg} />
          ) : (
            <Feather name={icon as any} size={18} color={colors.fg} />
          )}
        </View>

        {tag ? (
          <View
            style={{
              paddingVertical: 2.5,
              paddingHorizontal: 7.5,
              borderRadius: 999,
              backgroundColor: colors.bg,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 10.5, fontWeight: "700", color: colors.fg }}>
              {tag}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Main Metric Value */}
      <View style={{ gap: 2, marginTop: 2 }}>
        <Text style={{ fontSize: 12, fontWeight: "500", color: c.slate }}>{title}</Text>
        <Text style={{ fontSize: 18, fontWeight: "700", color: c.ink, letterSpacing: -0.3 }}>
          {value}
        </Text>
        <Text style={{ fontSize: 11, fontWeight: "600", color: colors.fg }}>
          {target}
        </Text>
      </View>

      {/* Confidence / Data Context Note */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: isDark ? c.hairline : "#F1F5F9",
          paddingTop: 6,
          marginTop: 2,
        }}
      >
        <Text style={{ fontSize: 10.5, color: c.steel, lineHeight: 14 }}>
          {confidenceNote}
        </Text>
      </View>
    </View>
  );
}

// ─── 3. Interactive 7-Day Rhythm Strip & Day Inspector ────────────────────────
function InteractiveWeekRhythm({
  dailyRecords,
  streak,
}: {
  dailyRecords: any[];
  streak: number;
}) {
  const { c, isDark } = useDs();
  const [selectedIndex, setSelectedIndex] = useState(() => {
    // Default to the last day with records, or today (last index)
    const lastWithRecord = dailyRecords.map((d) => d.has_records).lastIndexOf(true);
    return lastWithRecord >= 0 ? lastWithRecord : dailyRecords.length - 1;
  });
  const [showAllLoggedDays, setShowAllLoggedDays] = useState(false);

  const daysActive = dailyRecords.filter((d) => d.has_records).length;
  const selectedDay = dailyRecords[selectedIndex] || dailyRecords[dailyRecords.length - 1];
  const isSelectedToday = selectedIndex === dailyRecords.length - 1;

  // Filter only days that have actual records for the expanded list
  const activeDaysOnly = dailyRecords.filter((d) => d.has_records);

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 18,
        backgroundColor: isDark ? c.surface : "#FFFFFF",
        borderWidth: 1,
        borderColor: isDark ? c.hairline : "#EEF2F6",
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
      {/* Rhythm Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: c.ink, letterSpacing: -0.2 }}>
            7-Day Activity Rhythm
          </Text>
          <Text style={{ fontSize: 12.5, color: c.slate }}>
            {daysActive} of 7 days logged this week
          </Text>
        </View>

        {streak > 0 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingVertical: 3.5,
              paddingHorizontal: 8.5,
              borderRadius: 999,
              backgroundColor: isDark ? "rgba(249, 115, 22, 0.16)" : "#FFF7ED",
              borderWidth: 1,
              borderColor: isDark ? "rgba(249, 115, 22, 0.3)" : "#FED7AA",
            }}
          >
            <Text style={{ fontSize: 12 }}>🔥</Text>
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: "700",
                color: isDark ? "#FB923C" : "#EA580C",
              }}
            >
              {streak}-day streak
            </Text>
          </View>
        ) : null}
      </View>

      {/* 7-Day Interactive Day Pills */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        {dailyRecords.map((dayData, idx) => {
          const isSelected = idx === selectedIndex;
          const isToday = idx === dailyRecords.length - 1;
          const hasLogged = dayData.has_records;
          const hasSymptoms = dayData.symptoms?.length > 0;

          return (
            <TouchableOpacity
              key={idx}
              onPress={() => setSelectedIndex(idx)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${dayData.day}, ${dayData.date}. ${hasLogged ? "Logged" : "No logs"}`}
              style={{
                alignItems: "center",
                gap: 5,
                flex: 1,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: isSelected
                  ? isDark ? "rgba(2, 132, 199, 0.16)" : "#E0F2FE"
                  : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 10.5,
                  fontWeight: isSelected || isToday ? "700" : "500",
                  color: isSelected
                    ? isDark ? "#38BDF8" : "#0284C7"
                    : isToday
                    ? isDark ? "#7DD3FC" : "#0369A1"
                    : c.steel,
                  textTransform: "uppercase",
                }}
              >
                {dayData.short_day || dayData.day?.slice(0, 3)}
              </Text>

              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected
                    ? isDark ? "#0284C7" : "#0284C7"
                    : hasLogged
                    ? isDark ? "rgba(16, 185, 129, 0.2)" : "#ECFDF5"
                    : isDark ? c.surfaceAlt : "#F1F5F9",
                  borderWidth: isSelected ? 2 : hasLogged ? 1 : 0,
                  borderColor: isSelected
                    ? isDark ? "#38BDF8" : "#0369A1"
                    : hasLogged
                    ? isDark ? "rgba(16, 185, 129, 0.35)" : "#A7F3D0"
                    : "transparent",
                }}
              >
                {hasSymptoms ? (
                  <Feather
                    name="alert-triangle"
                    size={14}
                    color={isSelected ? "#FFFFFF" : isDark ? "#FBBF24" : "#D97706"}
                  />
                ) : hasLogged ? (
                  <Feather
                    name="check"
                    size={16}
                    color={isSelected ? "#FFFFFF" : isDark ? "#34D399" : "#059669"}
                  />
                ) : (
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: isSelected
                        ? "#FFFFFF"
                        : isDark ? c.steel : "#CBD5E1",
                    }}
                  />
                )}
              </View>

              <Text
                style={{
                  fontSize: 10,
                  fontWeight: isSelected ? "700" : "500",
                  color: isSelected
                    ? isDark ? "#38BDF8" : "#0284C7"
                    : c.steel,
                }}
              >
                {dayData.date?.split(" ")[1] || ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Day Inspector Panel */}
      <View
        style={{
          borderRadius: 14,
          backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
          padding: 13,
          gap: 10,
          borderWidth: 1,
          borderColor: isDark ? c.hairline : "#EEF2F6",
        }}
      >
        {/* Header of inspected day */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Feather name="calendar" size={13} color={c.slate} />
            <Text style={{ fontSize: 13.5, fontWeight: "700", color: c.ink }}>
              {selectedDay.date} — {selectedDay.day}
            </Text>
            {isSelectedToday ? (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 999,
                  backgroundColor: isDark ? "rgba(14, 165, 233, 0.2)" : "#E0F2FE",
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "700", color: isDark ? "#38BDF8" : "#0284C7" }}>
                  TODAY
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={{ fontSize: 11.5, color: c.steel }}>
            {selectedDay.has_records ? "Logged" : "Rest day"}
          </Text>
        </View>

        {/* Inspected Day Details */}
        {selectedDay.has_records ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, paddingTop: 2 }}>
            {/* Blood Pressure */}
            {selectedDay.vitals?.length > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: isDark ? "rgba(225, 29, 72, 0.12)" : "#FFF1F2",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(225, 29, 72, 0.25)" : "#FECDD3",
                }}
              >
                <Feather name="activity" size={12} color={isDark ? "#FB7185" : "#E11D48"} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#FDA4AF" : "#BE123C" }}>
                  BP: {selectedDay.vitals[0].systolic}/{selectedDay.vitals[0].diastolic} mmHg
                  {selectedDay.vitals[0].bpm ? ` (${selectedDay.vitals[0].bpm} BPM)` : ""}
                </Text>
              </View>
            ) : null}

            {/* Movement */}
            {selectedDay.movement?.length > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: isDark ? "rgba(16, 185, 129, 0.12)" : "#ECFDF5",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(16, 185, 129, 0.25)" : "#A7F3D0",
                }}
              >
                <MaterialCommunityIcons name="walk" size={13} color={isDark ? "#34D399" : "#059669"} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#6EE7B7" : "#047857" }}>
                  {selectedDay.movement.reduce((sum: number, m: any) => sum + (m.duration || 0), 0)} min exercise
                </Text>
              </View>
            ) : null}

            {/* Meals */}
            {selectedDay.nutrition?.length > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: isDark ? "rgba(249, 115, 22, 0.12)" : "#FFF7ED",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(249, 115, 22, 0.25)" : "#FED7AA",
                }}
              >
                <MaterialCommunityIcons name="silverware-fork-knife" size={12} color={isDark ? "#FB923C" : "#EA580C"} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#FDBA74" : "#C2410C" }}>
                  {selectedDay.nutrition.length} meal{selectedDay.nutrition.length === 1 ? "" : "s"} logged
                  {selectedDay.nutrition[0]?.sodium_mg ? ` (${selectedDay.nutrition.reduce((s: number, m: any) => s + (m.sodium_mg || 0), 0)} mg Na)` : ""}
                </Text>
              </View>
            ) : null}

            {/* Sleep */}
            {selectedDay.sleep?.length > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: isDark ? "rgba(124, 58, 237, 0.12)" : "#F5F3FF",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(124, 58, 237, 0.25)" : "#DDD6FE",
                }}
              >
                <Feather name="moon" size={12} color={isDark ? "#A78BFA" : "#7C3AED"} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#C4B5FD" : "#6D28D9" }}>
                  {selectedDay.sleep[0].hours}h sleep ({selectedDay.sleep[0].quality || "restful"})
                </Text>
              </View>
            ) : null}

            {/* Symptoms */}
            {selectedDay.symptoms?.length > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(239, 68, 68, 0.25)" : "#FECACA",
                }}
              >
                <Feather name="alert-triangle" size={12} color={isDark ? "#F87171" : "#DC2626"} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#FCA5A5" : "#B91C1C" }}>
                  Symptom: {selectedDay.symptoms[0].name} ({selectedDay.symptoms[0].severity}/10)
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
            <Feather name="info" size={14} color={c.steel} />
            <Text style={{ flex: 1, fontSize: 12.5, color: c.slate }}>
              No activities or vitals recorded for this day. Scheduled rest is healthy for cardiovascular recovery.
            </Text>
          </View>
        )}
      </View>

      {/* Toggle to see all active days without cluttering */}
      {activeDaysOnly.length > 0 && (
        <TouchableOpacity
          onPress={() => setShowAllLoggedDays((prev) => !prev)}
          accessibilityRole="button"
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 4,
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: "600", color: isDark ? "#38BDF8" : "#0284C7" }}>
            {showAllLoggedDays
              ? "Collapse logged days list"
              : `View all active days with logs (${activeDaysOnly.length})`}
          </Text>
          <Feather
            name={showAllLoggedDays ? "chevron-up" : "chevron-down"}
            size={14}
            color={isDark ? "#38BDF8" : "#0284C7"}
          />
        </TouchableOpacity>
      )}

      {/* Expanded Active Days (only days with logs, zero empty rest spam) */}
      {showAllLoggedDays && (
        <View style={{ gap: 8, marginTop: 4 }}>
          {activeDaysOnly.map((dayData, idx) => (
            <View
              key={idx}
              style={{
                borderRadius: 12,
                backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
                borderWidth: 1,
                borderColor: isDark ? c.hairline : "#EEF2F6",
                padding: 11,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: c.ink }}>
                  {dayData.date} — {dayData.day}
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? "#34D399" : "#059669", fontWeight: "600" }}>
                  Active
                </Text>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                {dayData.vitals?.length > 0 && (
                  <Text style={{ fontSize: 12, color: c.slate }}>
                    • BP {dayData.vitals[0].systolic}/{dayData.vitals[0].diastolic}
                  </Text>
                )}
                {dayData.movement?.length > 0 && (
                  <Text style={{ fontSize: 12, color: c.slate }}>
                    • {dayData.movement.reduce((sum: number, m: any) => sum + (m.duration || 0), 0)} min exercise
                  </Text>
                )}
                {dayData.nutrition?.length > 0 && (
                  <Text style={{ fontSize: 12, color: c.slate }}>
                    • {dayData.nutrition.length} meal{dayData.nutrition.length === 1 ? "" : "s"}
                  </Text>
                )}
                {dayData.sleep?.length > 0 && (
                  <Text style={{ fontSize: 12, color: c.slate }}>
                    • {dayData.sleep[0].hours}h sleep
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen Component ───────────────────────────────────────────────────
export default function WrapUpScreen() {
  const router = useRouter();
  const { c, isDark } = useDs();
  const insets = useSafeAreaInsets();

  const { userId, user, token } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isOfflineData, setIsOfflineData] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const wrapupCacheKey = userId ? `@wrapup_cache_${userId}` : null;

  const fetchData = useCallback(
    async (silent = false) => {
      if (!userId) return;

      if (!silent) {
        try {
          if (wrapupCacheKey) {
            const cached = await AsyncStorage.getItem(wrapupCacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              setData(parsed);
              setIsOfflineData(true);
              setIsLoading(false);
            } else {
              setIsLoading(true);
            }
          } else {
            setIsLoading(true);
          }
        } catch (cacheErr) {
          console.warn("Failed to load wrapup cache:", cacheErr);
          setIsLoading(true);
        }
      }

      try {
        const d = new Date();
        const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
          d.getDate()
        ).padStart(2, "0")}`;
        const effectiveToken = token || (await getToken()) || "";
        const response = await apiFetch(`/api/dashboard/wrapup?local_date=${localDate}`, {
          headers: { Authorization: `Bearer ${effectiveToken}` },
        });
        if (response.ok) {
          const result = await response.json();
          setData(result);
          setIsOfflineData(false);
          setLoadFailed(false);
          // It has been seen, so the Dashboard's "ready" banner can rest for a week
          markWeeklyReportOpened(userId).catch(() => {});
          if (wrapupCacheKey) {
            await AsyncStorage.setItem(wrapupCacheKey, JSON.stringify(result));
          }
        } else {
          setLoadFailed(true);
        }
      } catch (error) {
        console.error("Wrap-up fetch error:", error);
        setLoadFailed(true);
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [userId, wrapupCacheKey, token]
  );

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  function escapeHtml(unsafe: any): string {
    if (unsafe === null || unsafe === undefined) return "";
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const exportReport = async () => {
    if (!data) return;
    try {
      const patientName = `${escapeHtml(user?.first_name || "User")} ${escapeHtml(
        user?.last_name || ""
      )}`.trim();
      const periodDisplay = escapeHtml(data.date_range?.display || "Weekly Health Record");
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: ${P.ink}; line-height: 1.6; }
              h1 { font-size: 24px; font-weight: bold; margin-bottom: 4px; color: ${P.ink}; }
              h2 { font-size: 16px; font-weight: bold; color: ${P.charcoal}; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid ${P.hairline}; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
              h3 { margin-bottom: 8px; font-size: 14px; text-transform: uppercase; color: ${P.ink}; }
              p { margin: 0 0 16px 0; color: ${P.slate}; font-size: 14px; }
              .details { margin-bottom: 32px; font-size: 14px; background-color: ${P.surface}; padding: 20px; border-radius: 8px; border: 1px solid ${P.hairline}; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 24px; font-size: 14px; }
              th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid ${P.hairline}; }
              th { background-color: ${P.surfaceAlt}; font-weight: bold; color: ${P.slate}; }
              td { color: ${P.charcoal}; }
              .highlight { font-weight: bold; color: ${P.ink}; }
              .subtext { font-size: 12px; color: ${P.slate}; }
              .record-card { margin-bottom: 16px; padding: 12px; border: 1px solid ${P.hairline}; border-radius: 8px; }
            </style>
          </head>
          <body>
            <h1>HEARTLINK WEEKLY HEALTH RECORD</h1>
            <div class="details">
              <strong>Patient:</strong> ${patientName}<br>
              <strong>Period:</strong> ${periodDisplay}
            </div>
            
            <h2>WEEKLY SUMMARY</h2>
            <table>
              <tr><td>Average recorded stability score</td><td class="highlight">${escapeHtml(
                data.overview?.hss_average ?? "Not recorded"
              )}</td></tr>
              <tr><td>Movement</td><td class="highlight">${Number(
                data.overview?.movement_minutes || 0
              )} min</td></tr>
              <tr><td>Meals</td><td class="highlight">${Number(
                data.overview?.meal_days || 0
              )} days recorded</td></tr>
              <tr><td>Sleep</td><td class="highlight">${
                data.overview?.sleep_average_hours
                  ? Number(data.overview.sleep_average_hours) + " hr average"
                  : "Not recorded"
              }</td></tr>
              <tr><td>Vitals</td><td class="highlight">${Number(
                data.overview?.vital_days || 0
              )} readings</td></tr>
              <tr><td>Symptoms</td><td class="highlight">${Number(
                data.overview?.symptom_count || 0
              )} recorded</td></tr>
            </table>

            <h2>DAILY RECORD</h2>
            ${(data.daily_records || [])
              .map(
                (r: any) => `
              <div class="record-card">
                <h3>${escapeHtml(r.date)}</h3>
                ${
                  !r.has_records
                    ? `<p style="color:${P.steel}; font-size: 13px;">No records</p>`
                    : `
                  ${
                    r.movement?.length
                      ? `<p><strong>Movement:</strong><br>${r.movement
                          .map((m: any) => `${escapeHtml(m.name)} — ${Number(m.duration || 0)} min`)
                          .join("<br>")}</p>`
                      : ""
                  }
                  ${
                    r.nutrition?.length
                      ? `<p><strong>Meals:</strong><br>${r.nutrition
                          .map(
                            (m: any) =>
                              `${escapeHtml(m.meal_name)} — ${Number(m.calories || 0)} kcal, ${Number(
                                m.sodium_mg || 0
                              )}mg sodium`
                          )
                          .join("<br>")}</p>`
                      : ""
                  }
                  ${
                    r.vitals?.length
                      ? `<p><strong>Vitals:</strong><br>${r.vitals
                          .map(
                            (v: any) =>
                              `${Number(v.systolic || 0)}/${Number(v.diastolic || 0)} mmHg — ${Number(
                                v.bpm || 0
                              )} BPM`
                          )
                          .join("<br>")}</p>`
                      : ""
                  }
                  ${
                    r.sleep?.length
                      ? `<p><strong>Sleep:</strong><br>${r.sleep
                          .map(
                            (s: any) =>
                              `${Number(s.hours || 0)} hours (Quality: ${escapeHtml(s.quality)})`
                          )
                          .join("<br>")}</p>`
                      : ""
                  }
                  ${
                    r.symptoms?.length
                      ? `<p><strong>Symptoms:</strong><br>${r.symptoms
                          .map(
                            (s: any) =>
                              `${escapeHtml(s.name)} (Severity: ${Number(s.severity || 0)}/10)`
                          )
                          .join("<br>")}</p>`
                      : ""
                  }
                `
                }
              </div>
            `
              )
              .join("")}

            <h2>VITAL TIMELINE</h2>
            ${
              data.vitals?.records?.length
                ? data.vitals.records
                    .map(
                      (r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: ${P.slate}; font-size: 12px; text-transform: uppercase;">${escapeHtml(
                        r.date
                      )} · ${escapeHtml(r.time)}</strong><br>
                Blood Pressure: <strong>${Number(r.systolic || 0)} / ${Number(
                        r.diastolic || 0
                      )} mmHg</strong><br>
                Heart Rate: <strong>${Number(r.bpm || 0)} BPM</strong>
                ${r.weight_kg ? `<br>Weight: <strong>${Number(r.weight_kg).toFixed(1)} kg</strong>` : ""}
              </div>
            `
                    )
                    .join("")
                : `<p style="color:${P.steel};">Not recorded</p>`
            }

            <h2>SLEEP TIMELINE</h2>
            ${
              data.sleep?.records?.length
                ? data.sleep.records
                    .map(
                      (r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: ${P.slate}; font-size: 12px; text-transform: uppercase;">${escapeHtml(
                        r.date
                      )}</strong><br>
                Duration: <strong>${Number(r.hours || 0)}h</strong><br>
                Quality: <strong>${escapeHtml(r.quality)}</strong>
              </div>
            `
                    )
                    .join("")
                : `<p style="color:${P.steel};">No sleep records were logged during this period.</p>`
            }

            <h2>SYMPTOM TIMELINE</h2>
            ${
              data.symptoms?.records?.length
                ? data.symptoms.records
                    .map(
                      (r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: ${P.slate}; font-size: 12px; text-transform: uppercase;">${escapeHtml(
                        r.date
                      )} · ${escapeHtml(r.time)}</strong><br>
                <strong>${escapeHtml(r.name)}</strong><br>
                Severity: <strong>${Number(r.severity || 0)}/10</strong><br>
                Context: <strong>${escapeHtml(r.context || "Not specified")}</strong>
              </div>
            `
                    )
                    .join("")
                : `<p style="color:${P.steel};">Not recorded</p>`
            }

            <h2>EXERCISE TIMELINE</h2>
            ${
              data.movement?.records?.length
                ? data.movement.records
                    .map(
                      (r: any) => `
              <div style="margin-bottom: 16px; font-size: 13px;">
                <strong style="color: ${P.slate}; font-size: 12px; text-transform: uppercase;">${escapeHtml(
                        r.date
                      )} · ${escapeHtml(r.time)}</strong><br>
                <strong>${escapeHtml(r.name)}</strong><br>
                Duration: ${Number(r.duration || 0)} min<br>
                Type: ${escapeHtml(r.type)}<br>
                Intensity: ${escapeHtml(r.intensity)}<br>
                Goal: ${escapeHtml(r.goal)}<br>
                Status: ${escapeHtml(r.status)}<br>
                ${
                  r.instructions && r.instructions.length
                    ? `<div style="margin-top: 4px; color: ${P.slate};"><em>How it was performed:</em><br> ${r.instructions
                        .map((ins: string, i: number) => `${i + 1}. ${escapeHtml(ins)}`)
                        .join("<br>")}</div>`
                    : ""
                }
              </div>
            `
                    )
                    .join("")
                : `<p style="color:${P.steel};">Not recorded</p>`
            }

            <h2>MEAL TIMELINE</h2>
            ${
              data.nutrition?.records?.length
                ? data.nutrition.records
                    .map(
                      (r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: ${P.slate}; font-size: 12px; text-transform: uppercase;">${escapeHtml(
                        r.date
                      )} · ${escapeHtml(r.time)}</strong><br>
                <strong>${escapeHtml(r.meal_name)}</strong><br>
                ${Number(r.calories || 0)} kcal<br>
                ${Number(r.sodium_mg || 0)} mg sodium
              </div>
            `
                    )
                    .join("")
                : `<p style="color:${P.steel};">Not recorded</p>`
            }

            <h2>HSS / STABILITY</h2>
            <p>Weekly Average: <strong>${escapeHtml(data.stability?.average ?? "Not recorded")}</strong></p>
            ${
              data.stability?.records?.length
                ? `
              <p>Daily Recorded Scores:</p>
              <ul>
                ${data.stability.records
                  .map((r: any) => `<li>${escapeHtml(r.date)} — ${escapeHtml(r.score)}</li>`)
                  .join("")}
              </ul>
            `
                : ""
            }
          </body>
        </html>
      `;

      const { uri, base64 } = await Print.printToFileAsync({ html, base64: true });
      if (!(await Sharing.isAvailableAsync())) {
        alert("Sharing is not available on this device.");
        return;
      }

      const newUri = `${FileSystem.documentDirectory}Weekly_Health_Report.pdf`;
      await FileSystem.writeAsStringAsync(newUri, base64!, { encoding: FileSystem.EncodingType.Base64 });

      if (isCurrentlySharing) return;
      isCurrentlySharing = true;
      try {
        await Sharing.shareAsync(newUri, {
          UTI: "com.adobe.pdf",
          mimeType: "application/pdf",
          dialogTitle: "Share Weekly Report",
        });
      } finally {
        setTimeout(() => {
          isCurrentlySharing = false;
        }, 1000);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to generate report.");
    }
  };

  // Error boundary state matching existing unit tests
  if (!data && loadFailed && !isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 14 }}>
          <InfoNote
            icon="wifi-off"
            title="Your summary couldn't load"
            text="Check your connection, then try again. Your logs are safe."
          />
          <DsButton label="Try again" variant="secondary" onPress={() => fetchData()} block />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
        <WrapUpSkeleton />
      </SafeAreaView>
    );
  }

  const avgSys = data.vitals?.avg_systolic;
  const avgDia = data.vitals?.avg_diastolic;
  const vitalDays = data.overview?.vital_days || data.vitals?.days_logged || 0;
  const activeMins = data.overview?.movement_minutes || data.movement?.total_minutes || 0;
  const workoutCount = data.movement?.session_count || 0;
  const avgSleep = data.overview?.sleep_average_hours || data.sleep?.avg_hours;
  const sleepDays = data.sleep?.days_logged || (avgSleep ? 1 : 0);
  const mealCount = data.nutrition?.meals_recorded || 0;
  const mealDays = data.overview?.meal_days || data.nutrition?.days_logged || 0;
  const avgSodium = mealDays > 0 ? Math.round((data.nutrition?.sodium_mg || 0) / mealDays) : 0;

  // BP Status Tag
  let bpTag = "No data";
  let bpTint: "mint" | "sky" | "peach" | "rose" = "sky";
  if (avgSys) {
    if (avgSys < 120 && avgDia <= 80) {
      bpTag = "Optimal";
      bpTint = "mint";
    } else if (avgSys <= 129 && avgDia <= 80) {
      bpTag = "Elevated";
      bpTint = "peach";
    } else {
      bpTag = "Stage 1";
      bpTint = "rose";
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? c.canvas : "#F8FAFC" }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* ── Navigation Header (Clean Title, No Truncation) ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? c.hairline : "#EEF2F6",
          backgroundColor: isDark ? c.canvas : "#FFFFFF",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1, marginRight: 10 }}>
          <SquareIconButton
            icon="arrow-left"
            label="Back to Dashboard"
            onPress={() => router.back()}
          />
          <View style={{ flex: 1 }}>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: c.ink,
                letterSpacing: -0.3,
              }}
            >
              Weekly Summary
            </Text>
            <Text style={{ fontSize: 12, color: c.slate }} numberOfLines={1}>
              {data.date_range?.display || "Last 7 days"}
            </Text>
          </View>
        </View>

        {/* Compact Square Share Action Button */}
        <SquareIconButton
          icon="share-2"
          label="Export PDF consultation summary"
          onPress={exportReport}
        />
      </View>

      {/* ── Scrollable Body ── */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 120, // Generous padding so cards are never covered by floating bottom tab bar
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.line} />}
      >
        {/* Offline Notice */}
        {isOfflineData && (
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(245, 158, 11, 0.16)" : "#FEF3C7",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderWidth: 1,
              borderColor: isDark ? "rgba(245, 158, 11, 0.3)" : "#FDE68A",
            }}
          >
            <Feather name="wifi-off" size={15} color={isDark ? "#FBBF24" : "#D97706"} />
            <Text style={{ flex: 1, fontSize: 12.5, fontWeight: "500", color: isDark ? "#FBBF24" : "#B45309" }}>
              Showing saved health summary. Connect to the internet to fetch latest readings.
            </Text>
          </View>
        )}

        {/* ── 1. Executive Health Narrative ("How Did I Do?") ── */}
        <ExecutiveVerdictCard data={data} />

        {/* ── 2. Benchmarked Clinical Metrics ("Your Numbers") ── */}
        <View style={{ gap: 10 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: c.steel,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              paddingHorizontal: 2,
            }}
          >
            Your Clinical Numbers
          </Text>

          <View style={{ gap: 10 }}>
            {/* Row 1: Blood Pressure & Aerobic Movement */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <BenchmarkMetricCard
                title="Blood Pressure"
                value={avgSys ? `${avgSys}/${avgDia}` : "--"}
                target="Target: < 120/80 mmHg"
                tag={bpTag}
                confidenceNote={vitalDays > 0 ? `${vitalDays} of 7 days recorded` : "No BP logged this week"}
                icon="activity"
                iconType="feather"
                tint={bpTint}
              />

              <BenchmarkMetricCard
                title="Weekly Movement"
                value={`${activeMins} min`}
                target="Goal: 150 min / week"
                tag={`${Math.min(100, Math.round((activeMins / 150) * 100))}% of goal`}
                confidenceNote={`${workoutCount} active session${workoutCount === 1 ? "" : "s"}`}
                icon="walk"
                iconType="material"
                tint="mint"
              />
            </View>

            {/* Row 2: Nightly Sleep & Diet / Sodium */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <BenchmarkMetricCard
                title="Nightly Rest"
                value={avgSleep ? `${avgSleep} hr` : "--"}
                target="Target: 7–9 hrs / night"
                tag={avgSleep && avgSleep >= 7 && avgSleep <= 9 ? "Optimal" : avgSleep ? "Fair" : undefined}
                confidenceNote={avgSleep ? `${sleepDays} of 7 nights tracked` : "Track nightly sleep"}
                icon="moon"
                iconType="feather"
                tint="lavender"
              />

              <BenchmarkMetricCard
                title="Diet & Sodium"
                value={mealCount > 0 ? `${mealCount} meals` : "--"}
                target="Limit: < 2,000 mg / day"
                tag={mealCount > 0 ? (avgSodium <= 650 ? "Low Sodium" : "Moderate") : undefined}
                confidenceNote={
                  mealDays < 4
                    ? "Log more meals for daily avg"
                    : `~${avgSodium.toLocaleString()} mg daily avg`
                }
                icon="silverware-fork-knife"
                iconType="material"
                tint="peach"
              />
            </View>
          </View>
        </View>

        {/* ── 3. Symptoms Flag Section (If Any Logged) ── */}
        {data.symptoms?.records?.length > 0 && (
          <View style={{ gap: 10 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: isDark ? "#F87171" : "#DC2626",
                letterSpacing: 0.6,
                textTransform: "uppercase",
                paddingHorizontal: 2,
              }}
            >
              Symptoms Flagged For Doctor
            </Text>

            <View style={{ gap: 8 }}>
              {data.symptoms.records.map((symptom: any, index: number) => (
                <View
                  key={index}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: isDark ? "rgba(239, 68, 68, 0.12)" : "#FEF2F2",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(239, 68, 68, 0.28)" : "#FECACA",
                    flexDirection: "row",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 9,
                      backgroundColor: isDark ? "rgba(239, 68, 68, 0.22)" : "#FEE2E2",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    <Feather name="alert-triangle" size={16} color={isDark ? "#F87171" : "#DC2626"} />
                  </View>

                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14.5, fontWeight: "700", color: c.ink }}>
                        {symptom.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: c.slate }}>{symptom.date}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: isDark ? "#FCA5A5" : "#991B1B", fontWeight: "600" }}>
                      Severity: {symptom.severity}/10
                    </Text>
                    {symptom.context ? (
                      <Text style={{ fontSize: 12.5, color: c.slate, lineHeight: 17, marginTop: 2 }}>
                        {symptom.context}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── 4. Interactive 7-Day Consistency & Rhythm Inspector ── */}
        <InteractiveWeekRhythm
          dailyRecords={data.daily_records || []}
          streak={data.consistency?.current_streak || 0}
        />

        {/* ── 5. Clinical Reports & Doctor Consultation PDF ── */}
        <View style={{ gap: 10, marginTop: 2 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: c.steel,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              paddingHorizontal: 2,
            }}
          >
            For Your Doctor & Checkups
          </Text>

          {/* Card A: Doctor Consultation Summary */}
          <AnimatedButton
            onPress={exportReport}
            accessibilityRole="button"
            accessibilityLabel="Doctor consultation summary, export PDF"
            style={{
              padding: 16,
              borderRadius: 18,
              backgroundColor: isDark ? c.surface : "#FFFFFF",
              borderWidth: 1,
              borderColor: isDark ? c.hairline : "#EEF2F6",
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              ...Platform.select({
                ios: {
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.25 : 0.04,
                  shadowRadius: 6,
                },
                android: { elevation: 2 },
              }),
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                backgroundColor: isDark ? "rgba(14, 165, 233, 0.16)" : "#F0F9FF",
                borderWidth: 1,
                borderColor: isDark ? "rgba(14, 165, 233, 0.3)" : "#BAE6FD",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="file-text" size={22} color={isDark ? "#38BDF8" : "#0284C7"} />
            </View>

            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink, letterSpacing: -0.2 }}>
                  Doctor consultation summary
                </Text>
                <View
                  style={{
                    paddingVertical: 2,
                    paddingHorizontal: 7,
                    borderRadius: 999,
                    backgroundColor: isDark ? "rgba(16, 185, 129, 0.18)" : "#ECFDF5",
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: "700", color: isDark ? "#34D399" : "#059669" }}>
                    PDF READY
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: c.slate, lineHeight: 18 }}>
                Includes 7-day blood pressure logs, habits, and flagged reviews
              </Text>
            </View>

            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="share" size={16} color={c.steel} />
            </View>
          </AnimatedButton>

          {/* Card B: Longer 1- or 3-Month Report */}
          <AnimatedButton
            onPress={() => router.push("/(home)/(profile)/health-report")}
            accessibilityRole="button"
            accessibilityLabel="1- or 3-month health report, HeartLink Premium"
            style={{
              padding: 16,
              borderRadius: 18,
              backgroundColor: isDark ? c.surface : "#FFFFFF",
              borderWidth: 1,
              borderColor: isDark ? c.hairline : "#EEF2F6",
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              ...Platform.select({
                ios: {
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.25 : 0.04,
                  shadowRadius: 6,
                },
                android: { elevation: 2 },
              }),
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                backgroundColor: isDark ? "rgba(16, 185, 129, 0.16)" : "#ECFDF5",
                borderWidth: 1,
                borderColor: isDark ? "rgba(16, 185, 129, 0.3)" : "#A7F3D0",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="bar-chart-2" size={22} color={isDark ? "#34D399" : "#059669"} />
            </View>

            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: c.ink, letterSpacing: -0.2 }}>
                  1- or 3-month health report
                </Text>
                <View
                  style={{
                    paddingVertical: 2,
                    paddingHorizontal: 7,
                    borderRadius: 999,
                    backgroundColor: isDark ? "rgba(245, 158, 11, 0.18)" : "#FEF3C7",
                  }}
                >
                  <Text style={{ fontSize: 10.5, fontWeight: "700", color: isDark ? "#FBBF24" : "#B45309" }}>
                    PRO
                  </Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: c.slate, lineHeight: 18 }}>
                Longer term trend charts and comprehensive clinical exports
              </Text>
            </View>

            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: isDark ? c.surfaceAlt : "#F8FAFC",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name="chevron-right" size={18} color={c.steel} />
            </View>
          </AnimatedButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
