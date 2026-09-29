import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Pressable,
  BackHandler,
} from "react-native";
import Svg, { Path, Circle, Line as SvgLine } from "react-native-svg";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

let isCurrentlySharing = false;
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useUser } from "../../../contexts/UserContext";
import { Header } from "../../../components/Header";
import { theme } from "../../../constants/theme";

const base_url = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

const TOKENS = {
  ink: "#152131",
  sub: "#5C6B66",
  subDark: "#94A3B8",
  line: "#DCE3DF",
  lineDark: "rgba(148,163,184,0.16)",
  teal: "#1FAE8E",
  tealSoft: "#DCEFE9",
  tealSoftDark: "rgba(31,174,142,0.16)",
  orange: "#E08A2E",
  orangeSoft: "#FBF0DD",
  orangeSoftDark: "rgba(224,138,46,0.16)",
  pink: "#D94F6E",
  pinkSoft: "#FBE7EC",
  pinkSoftDark: "rgba(217,79,110,0.16)",
  indigo: "#6F6FD1",
  indigoSoft: "#EFE9FB",
  indigoSoftDark: "rgba(111,111,209,0.16)",
  critical: "#B23A3A",
  criticalSoft: "#F8E3E1",
  criticalSoftDark: "rgba(178,58,58,0.18)",
  neutralSoft: "#EDF1EF",
  neutralSoftDark: "rgba(148,163,184,0.14)",
};

function TactileCard({
  onPress,
  children,
  className = "",
  style,
  activeScale = 0.975,
  haptic = true,
  disabled = false,
}: any) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, { toValue: activeScale, useNativeDriver: true, speed: 45, bounciness: 4 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 35, bounciness: 6 }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={disabled}>
      <Animated.View style={[{ transform: [{ scale }] }, style]} className={className}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function getStatusTheme(score: number | null, isDark: boolean) {
  if (score === null || score === undefined) return { tier: "Getting Started", dotColor: isDark ? TOKENS.subDark : "#94A3B8", badgeBg: isDark ? TOKENS.neutralSoftDark : TOKENS.neutralSoft, badgeText: isDark ? TOKENS.subDark : TOKENS.sub, barColor: isDark ? "#475569" : TOKENS.line };
  if (score >= 80) return { tier: "Looking Great", dotColor: TOKENS.teal, badgeBg: isDark ? TOKENS.tealSoftDark : TOKENS.tealSoft, badgeText: TOKENS.teal, barColor: TOKENS.teal };
  if (score >= 60) return { tier: "On Track", dotColor: TOKENS.orange, badgeBg: isDark ? TOKENS.orangeSoftDark : TOKENS.orangeSoft, badgeText: TOKENS.orange, barColor: TOKENS.orange };
  if (score >= 50) return { tier: "Needs Attention", dotColor: TOKENS.pink, badgeBg: isDark ? TOKENS.pinkSoftDark : TOKENS.pinkSoft, badgeText: TOKENS.pink, barColor: TOKENS.pink };
  return { tier: "Take Action", dotColor: TOKENS.critical, badgeBg: isDark ? TOKENS.criticalSoftDark : TOKENS.criticalSoft, badgeText: TOKENS.critical, barColor: TOKENS.critical };
}

const controlPoint = (current: any, previous: any, next: any, reverse: boolean) => {
  const p = previous || current;
  const n = next || current;
  const smoothing = 0.2;
  const lengthX = n.x - p.x;
  const lengthY = n.y - p.y;
  const length = Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2));
  const angle = Math.atan2(lengthY, lengthX);
  const angleAdj = angle + (reverse ? Math.PI : 0);
  const lengthAdj = length * smoothing;
  const x = current.x + Math.cos(angleAdj) * lengthAdj;
  const y = current.y + Math.sin(angleAdj) * lengthAdj;
  return { x, y };
};

function buildPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const cp1 = controlPoint(points[i - 1], points[i - 2], points[i], false);
    const cp2 = controlPoint(points[i], points[i - 1], points[i + 1], true);
    d += ` C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${points[i].x},${points[i].y}`;
  }
  return d;
}

function buildAreaPath(points: { x: number; y: number }[], baseline: number): string {
  if (points.length === 0) return '';
  const line = buildPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

export default function TrendsTabScreen() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const router = useRouter();
  const { userId, token, logout } = useUser();

  const [activeTab, setActiveTab] = useState<"score" | "bp" | "bpm" | "sodium">("score");
  const [intervalDays, setIntervalDays] = useState<7 | 14 | 30>(7);
  const [chartWidth, setChartWidth] = useState(0);

  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!userId || !token) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${base_url}/api/analytics/${userId}?days=${intervalDays}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [userId, token, intervalDays]);

  const chartData = useMemo(() => {
    if (!analytics) {
      // Return a flatline or minimal data if loading
      return Array.from({ length: intervalDays }).map((_, i) => ({
        label: `${i + 1}`,
        value: 0
      }));
    }

    const daysArray = Array.from({ length: intervalDays }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (intervalDays - 1 - i));
      return {
        dateStr: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("en-US", { month: 'short', day: 'numeric' }),
        value: null as number | null
      };
    });

    if (activeTab === "score") {
      analytics.history?.forEach((h: any) => {
        const dStr = (h.computed_at || "").split("T")[0];
        const idx = daysArray.findIndex(d => d.dateStr === dStr);
        if (idx !== -1) daysArray[idx].value = h.score;
      });
    } else if (activeTab === "bp") {
      analytics.vitals?.filter((v:any) => v.type === "bp").forEach((v: any) => {
        const dStr = (v.logged_at || "").split("T")[0];
        const idx = daysArray.findIndex(d => d.dateStr === dStr);
        if (idx !== -1) daysArray[idx].value = v.systolic; 
      });
    } else if (activeTab === "bpm") {
      analytics.vitals?.filter((v:any) => v.type === "heart_rate" || v.type === "bpm").forEach((v: any) => {
        const dStr = (v.logged_at || "").split("T")[0];
        const idx = daysArray.findIndex(d => d.dateStr === dStr);
        if (idx !== -1) daysArray[idx].value = v.value; 
      });
    } else if (activeTab === "sodium") {
      analytics.vitals?.filter((v:any) => v.type === "meal").forEach((v: any) => {
        const dStr = (v.logged_at || "").split("T")[0];
        const idx = daysArray.findIndex(d => d.dateStr === dStr);
        if (idx !== -1) {
          daysArray[idx].value = (daysArray[idx].value || 0) + (v.sodium_mg || 0);
        }
      });
    }

    let lastVal = activeTab === "score" ? 75 : activeTab === "bp" ? 120 : activeTab === "bpm" ? 70 : 1500;
    daysArray.forEach(d => {
      if (d.value !== null) lastVal = d.value;
      else d.value = lastVal;
    });

    return daysArray;
  }, [analytics, activeTab, intervalDays]);

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
      const onBackPress = () => {
        router.replace("/(home)/(tabs)/dashboard");
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [fetchAnalytics, router])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const handleExportPDF = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const bpLog = analytics?.vitals?.filter((v:any)=>v.type==="bp").slice(-1)[0];
      const bpmLog = analytics?.vitals?.filter((v:any)=>v.type==="heart_rate" || v.type==="bpm").slice(-1)[0];
      
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Helvetica, sans-serif; padding: 40px; color: #152131; }
              h1 { color: #1FAE8E; }
              h2 { font-size: 18px; margin-top: 20px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
              .stat { font-size: 14px; margin: 10px 0; }
              .val { font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>HeartLink Trends Report</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
            
            <h2>Latest Vitals Summary</h2>
            <div class="stat">Heart Score: <span class="val">${latestHSS ?? "--"}/100</span></div>
            <div class="stat">Blood Pressure: <span class="val">${bpLog ? bpLog.systolic + '/' + bpLog.diastolic : "--/--"} mmHg</span></div>
            <div class="stat">Resting Heart Rate: <span class="val">${bpmLog ? bpmLog.value : "--"} bpm</span></div>
            
            <h2>Overview</h2>
            <p>A detailed view of your heart score and vitals over the last ${intervalDays} days.</p>
          </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (await Sharing.isAvailableAsync()) {
        if (isCurrentlySharing) return;
        isCurrentlySharing = true;
        try {
          await Sharing.shareAsync(uri);
        } finally {
          setTimeout(() => { isCurrentlySharing = false; }, 1000);
        }
      }
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const latestHSS = analytics?.history?.[analytics.history.length - 1]?.score ?? null;
  const activeTheme = getStatusTheme(latestHSS, isDark);

  // ─── Sub-components for Content ──────────────────────────────────────────
  
  const renderTabSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      className="mb-5 mt-2" 
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      style={{
        // Hide scrollbar natively on web browsers if they ignore showsHorizontalScrollIndicator
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none' // IE/Edge
      } as any}
    >
      {[
        { id: "score", label: "Heart Score" },
        { id: "bp", label: "Blood Pressure" },
        { id: "bpm", label: "Heart Rate" },
        { id: "sodium", label: "Sodium" },
      ].map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id as any)}
            className="px-4 py-2 rounded-full"
            style={{ 
              backgroundColor: isActive ? "#2563EB" : isDark ? "#1E293B" : "#FFFFFF",
              elevation: isActive ? 0 : 1,
              shadowColor: isActive ? "transparent" : "rgba(0,0,0,0.1)",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isActive ? 0 : 1,
              shadowRadius: isActive ? 0 : 2,
            }}
          >
            <Text 
              className="text-[13px] font-semibold"
              style={{ color: isActive ? "#FFFFFF" : isDark ? "#94A3B8" : "#64748B" }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderWeeklySummary = () => {
    return (
      <View className="bg-[#F4F7F9] dark:bg-slate-900 rounded-[28px] p-5 mb-4 border border-border dark:border-slate-800/60">
        <Text className="text-[11px] font-bold text-text-soft uppercase tracking-widest mb-4">
          {intervalDays === 7 ? "THIS WEEK" : intervalDays === 14 ? "LAST 2 WEEKS" : "LAST 30 DAYS"}
        </Text>
        <View className="flex-row justify-between mb-6 gap-2">
          {/* Sleep */}
          <View className="flex-1 bg-white dark:bg-surface rounded-2xl p-3 shadow-sm shadow-slate-200/50 dark:shadow-none">
            <View className="flex-row items-center gap-1.5 mb-2.5">
              <Feather name="moon" size={14} color="#367484" />
              <Text className="text-[12px] font-semibold text-text">Sleep</Text>
            </View>
            <View className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full w-full overflow-hidden mb-2.5">
              <View className="h-full rounded-full bg-[#367484]" style={{ width: `${Math.min(100, (Number(summaryStats.sleepHours) / 8) * 100)}%` }} />
            </View>
            <Text className="text-[13px] font-bold text-text">{summaryStats.sleepHours}<Text className="text-[11px] font-medium text-text-soft">/8hr</Text></Text>
          </View>
          
          {/* Activity */}
          <View className="flex-1 bg-white dark:bg-surface rounded-2xl p-3 shadow-sm shadow-slate-200/50 dark:shadow-none">
            <View className="flex-row items-center gap-1.5 mb-2.5">
              <MaterialCommunityIcons name="run" size={16} color="#2563EB" />
              <Text className="text-[12px] font-semibold text-text">Activity</Text>
            </View>
            <View className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full w-full overflow-hidden mb-2.5">
              <View className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.min(100, (summaryStats.activityMins / 30) * 100)}%` }} />
            </View>
            <Text className="text-[13px] font-bold text-text">{summaryStats.activityMins}<Text className="text-[11px] font-medium text-text-soft">/30m</Text></Text>
          </View>
          
          {/* Sodium */}
          <View className="flex-1 bg-white dark:bg-surface rounded-2xl p-3 shadow-sm shadow-slate-200/50 dark:shadow-none">
            <View className="flex-row items-center gap-1.5 mb-2.5">
              <MaterialCommunityIcons name="shaker-outline" size={14} color="#D97706" />
              <Text className="text-[12px] font-semibold text-text">Sodium</Text>
            </View>
            <View className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full w-full overflow-hidden mb-2.5">
              <View className="h-full rounded-full bg-[#D97706]" style={{ width: `${Math.min(100, (summaryStats.sodiumMg / 2000) * 100)}%` }} />
            </View>
            <Text className="text-[13px] font-bold text-text">{summaryStats.sodiumMg}<Text className="text-[11px] font-medium text-text-soft">/2g</Text></Text>
          </View>
        </View>

        <Text className="text-[11px] font-bold text-text-soft uppercase tracking-widest mb-4">Highlights</Text>
        
        <TouchableOpacity activeOpacity={0.7} className="flex-row items-center justify-between p-4 bg-white dark:bg-surface rounded-2xl mb-2.5 shadow-sm shadow-slate-200/50 dark:shadow-none">
          <View className="flex-row items-center gap-4">
            <View className="w-10 h-10 rounded-xl items-center justify-center bg-[#E6F4EA] dark:bg-[#E6F4EA]/10">
              <Feather name="award" size={18} color="#1FAE8E" />
            </View>
            <View>
              <Text className="text-[14px] font-bold text-text mb-0.5">Best day</Text>
              <Text className="text-[12px] text-text-soft">{highlights.bestDayText}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={isDark ? "#64748B" : "#94A3B8"} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} className="flex-row items-center justify-between p-4 bg-white dark:bg-surface rounded-2xl shadow-sm shadow-slate-200/50 dark:shadow-none">
          <View className="flex-row items-center gap-4">
            <View className="w-10 h-10 rounded-xl items-center justify-center bg-slate-100 dark:bg-slate-800">
              <MaterialCommunityIcons name="shaker-outline" size={18} color={isDark ? "#94A3B8" : "#64748B"} />
            </View>
            <View>
              <Text className="text-[14px] font-bold text-text mb-0.5">Highest sodium</Text>
              <Text className="text-[12px] text-text-soft">{highlights.highestSodiumText}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={isDark ? "#64748B" : "#94A3B8"} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderActiveChart = () => {
    const CHART_HEIGHT = 160;
    const CHART_PADDING = 12;
    const color = "#2563EB";
    const areaFillColor = `${color}25`;

    const values = chartData.map((d) => d.value!);

    const minValue = Math.min(...values) * 0.9;
    const maxValue = Math.max(...values) * 1.1;
    const valueRange = maxValue - minValue || 1;

    const usableWidth = chartWidth - CHART_PADDING * 2;
    const usableHeight = CHART_HEIGHT - CHART_PADDING * 2;

    const points = chartData.map((d, i) => {
      const x = chartData.length > 1
          ? CHART_PADDING + (usableWidth * i) / (chartData.length - 1)
          : CHART_PADDING + usableWidth / 2;
      const y = CHART_PADDING + usableHeight - ((d.value! - minValue) / valueRange) * usableHeight;
      return { x, y };
    });

    const linePath = buildPath(points);
    const areaPath = buildAreaPath(points, CHART_HEIGHT - CHART_PADDING);

    return (
      <View className="bg-white dark:bg-surface rounded-[28px] p-5 mb-4 shadow-sm shadow-slate-200/50 dark:shadow-none">
        
        {/* Metric Header */}
        <View className="flex-row items-start justify-between mb-4">
          <View>
            <Text className="text-[12px] font-semibold text-text-soft uppercase tracking-wider mb-1">
              {activeTab === "score" ? "Latest Heart Score" : activeTab === "bp" ? "Latest BP" : activeTab === "bpm" ? "Latest Resting HR" : "Total Sodium (Today)"}
            </Text>
            <View className="flex-row items-baseline">
              <Text className="text-[38px] font-bold text-text tracking-tight leading-none">
                {activeTab === "score" 
                  ? (latestHSS ?? "--") 
                  : activeTab === "bp" 
                    ? (analytics?.vitals?.filter((v:any)=>v.type==="bp").slice(-1)[0] ? `${analytics.vitals.filter((v:any)=>v.type==="bp").slice(-1)[0].systolic}/${analytics.vitals.filter((v:any)=>v.type==="bp").slice(-1)[0].diastolic}` : "--/--") 
                    : activeTab === "bpm"
                      ? (analytics?.vitals?.filter((v:any)=>v.type==="heart_rate" || v.type==="bpm").slice(-1)[0]?.value ?? "--")
                      : (chartData[chartData.length - 1]?.value ?? "--")
                }
              </Text>
              <Text className="text-[14px] font-medium text-text-soft ml-1.5">
                {activeTab === "score" ? "/ 100" : activeTab === "bp" ? "mmHg" : activeTab === "bpm" ? "bpm" : "mg"}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text className="text-[11px] font-bold text-text-soft uppercase tracking-widest mb-1.5">
              {intervalDays === 7 ? "THIS WEEK" : intervalDays === 14 ? "LAST 2 WEEKS" : "LAST 30 DAYS"}
            </Text>
            <View className="flex-row items-center bg-[#E6F4EA] px-2.5 py-1 rounded-full">
              <Feather name={activeTab === "score" ? "trending-up" : "trending-down"} size={12} color="#1FAE8E" />
              <Text className="text-[11px] font-bold ml-1 text-[#1FAE8E]">
                {activeTab === "score" ? "+5% vs last" : activeTab === "bp" ? "-2% vs last" : activeTab === "bpm" ? "-3% vs last" : "Under limit"}
              </Text>
            </View>
          </View>
        </View>

        {/* Time Interval Selector */}
        <View className="flex-row p-1 rounded-xl mb-4 bg-[#F4F7F9] dark:bg-slate-800">
          {([7, 14, 30] as const).map((days) => {
            const isActive = intervalDays === days;
            const label = `${days}D`;
            return (
              <TouchableOpacity
                key={days}
                onPress={() => { Haptics.selectionAsync(); setIntervalDays(days); }}
                activeOpacity={0.7}
                className="flex-1 py-2 items-center rounded-lg"
                style={{ 
                  backgroundColor: isActive ? (isDark ? "#334155" : "#FFFFFF") : "transparent",
                  elevation: isActive ? 1 : 0,
                  shadowColor: isActive ? "rgba(0,0,0,0.1)" : "transparent",
                  shadowOffset: isActive ? { width: 0, height: 1 } : undefined,
                  shadowOpacity: isActive ? 1 : 0,
                  shadowRadius: isActive ? 2 : 0,
                }}
              >
                <Text className="text-[12px] font-semibold tracking-tight">
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SVG CHART AREA / EMPTY STATE */}
        {activeTab === "sodium" ? (
          <View className="h-44 items-center justify-center border-b border-border mb-4 pb-4">
            <View className="w-12 h-12 rounded-full items-center justify-center mb-3">
              <MaterialCommunityIcons name="food-apple" size={20} color={TOKENS.indigo} />
            </View>
            <Text className="text-[14px] font-semibold text-text mb-1">No Sodium Data</Text>
            <Text className="text-[12px] text-center text-text-soft mb-3 px-4">You haven't logged any meals in this timeframe.</Text>
            <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} className="px-4 py-2 rounded-full">
              <Text className="text-[12px] font-semibold text-white">Log a Meal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mb-4">
            <View 
              style={{ height: CHART_HEIGHT, width: '100%', marginBottom: 8 }}
              onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
            >
              {chartWidth > 0 && (
                <Svg width={chartWidth} height={CHART_HEIGHT}>
                  {/* Gridline */}
                  <SvgLine
                    x1={CHART_PADDING}
                    x2={chartWidth - CHART_PADDING}
                    y1={CHART_HEIGHT - CHART_PADDING}
                    y2={CHART_HEIGHT - CHART_PADDING}
                    stroke={isDark ? "rgba(148,163,184,0.15)" : "rgba(148,163,184,0.4)"}
                    strokeWidth={1}
                  />
                  <Path d={areaPath} fill={areaFillColor} stroke="none" />
                  <Path
                    d={linePath}
                    fill="none"
                    stroke={color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {points.map((p, i) => (
                    <Circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={4}
                      fill={isDark ? "#1E293B" : "#FFFFFF"}
                      stroke={color}
                      strokeWidth={2.5}
                    />
                  ))}
                </Svg>
              )}
            </View>
            {chartWidth > 0 && (
              <View style={{ height: 20, width: chartWidth, position: 'relative' }}>
                {chartData.map((d, i) => {
                  let showLabel = false;
                  if (intervalDays === 7) {
                    showLabel = true;
                  } else if (intervalDays === 14) {
                    showLabel = i === 0 || i === 3 || i === 6 || i === 10 || i === 13;
                  } else {
                    showLabel = i === 0 || i === 6 || i === 12 || i === 18 || i === 24 || i === 29;
                  }

                  if (!showLabel) return null;

                  const x = chartData.length > 1
                      ? CHART_PADDING + (usableWidth * i) / (chartData.length - 1)
                      : CHART_PADDING + usableWidth / 2;

                  return (
                    <Text 
                      key={i} 
                      className="text-[10px] text-text-soft font-medium text-center absolute"
                      style={{ left: x - 25, width: 50, top: 0 }}
                    >
                      {d.label}
                    </Text>
                  );
                })}
              </View>
            )}
          </View>
        )}


      </View>
    );
  };

  const highlights = useMemo(() => {
    let bestDayText = "No data yet";
    let highestSodiumText = "No data yet";

    if (analytics) {
      // Best day by HSS score
      const history = analytics.history || [];
      if (history.length > 0) {
        const best = history.reduce((max: any, h: any) => h.score > max.score ? h : max, history[0]);
        if (best) {
          const date = new Date(best.computed_at);
          const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
          
          // Try to find BP for that day
          const dateStr = (best.computed_at || "").split("T")[0];
          const bps = (analytics.vitals || []).filter((v: any) => v.type === "bp" && (v.logged_at || "").startsWith(dateStr));
          if (bps.length > 0) {
            const latestBp = bps[bps.length - 1];
            bestDayText = `${weekday}, ${latestBp.systolic}/${latestBp.diastolic} mmHg`;
          } else {
            bestDayText = `${weekday}, ${Math.round(best.score)} Score`;
          }
        }
      }

      // Highest sodium by day
      const meals = (analytics.vitals || []).filter((v: any) => v.type === "meal");
      if (meals.length > 0) {
        const sodiumByDay: Record<string, number> = {};
        meals.forEach((m: any) => {
          const dateStr = (m.logged_at || "").split("T")[0];
          if (!sodiumByDay[dateStr]) sodiumByDay[dateStr] = 0;
          sodiumByDay[dateStr] += Number(m.sodium_mg || 0);
        });
        
        let maxSodium = -1;
        let maxSodiumDate = "";
        Object.entries(sodiumByDay).forEach(([dateStr, sodium]) => {
          if (sodium > maxSodium) {
            maxSodium = sodium;
            maxSodiumDate = dateStr;
          }
        });

        if (maxSodium >= 0 && maxSodiumDate) {
          const date = new Date(maxSodiumDate);
          const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
          highestSodiumText = `${weekday}, ${Math.round(maxSodium).toLocaleString()}mg`;
        }
      }
    }

    return { bestDayText, highestSodiumText };
  }, [analytics]);

  const summaryStats = useMemo(() => {
    let sleepHours = 0;
    let activityMins = 0;
    let sodiumMg = 0;
    
    if (analytics) {
      const sleepLogs = analytics.sleep_logs || [];
      if (sleepLogs.length > 0) {
        const totalSleep = sleepLogs.reduce((sum: number, s: any) => sum + (Number(s.duration_hours) || 0), 0);
        sleepHours = totalSleep / sleepLogs.length;
      }
      
      const exercises = analytics.exercise_logs || [];
      if (exercises.length > 0) {
        const totalExercise = exercises.reduce((sum: number, e: any) => sum + (Number(e.duration_minutes) || 0), 0);
        activityMins = totalExercise / exercises.length;
      }
      
      const meals = analytics.meal_logs || [];
      if (meals.length > 0) {
        const totalSodium = meals.reduce((sum: number, m: any) => sum + (Number(m.sodium_mg) || 0), 0);
        const sodiumByDay: Record<string, number> = {};
        meals.forEach((m: any) => {
          const dateStr = (m.logged_at || "").split("T")[0];
          if (!sodiumByDay[dateStr]) sodiumByDay[dateStr] = 0;
          sodiumByDay[dateStr] += Number(m.sodium_mg || 0);
        });
        const daysLogged = Object.keys(sodiumByDay).length;
        sodiumMg = daysLogged > 0 ? totalSodium / daysLogged : 0;
      }
    }
    
    return {
      sleepHours: sleepHours.toFixed(1),
      activityMins: Math.round(activityMins),
      sodiumMg: Math.round(sodiumMg),
    };
  }, [analytics]);

  // Highlights removed and combined into renderWeeklySummary

  return (
    <SafeAreaView className="flex-1 bg-[#F4F7F9] dark:bg-slate-900">
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.teal} />}
      >
        {/* Screen Header */}
        <View className="px-5 mb-5 mt-2 flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <Text className="text-[28px] font-bold text-text tracking-tight mb-1">
              Trends
            </Text>
            <Text className="text-[14px] text-text-soft flex-shrink" numberOfLines={2}>
              Analyze your vitals & discover patterns.
            </Text>
          </View>
          <TouchableOpacity 
            onPress={handleExportPDF} 
            className="w-10 h-10 rounded-full items-center justify-center bg-white dark:bg-surface shadow-sm shadow-slate-200/50 dark:shadow-none"
          >
            <Feather name="share-2" size={18} color={isDark ? "#FFFFFF" : "#334155"} />
          </TouchableOpacity>
        </View>

        {/* Tab Selector */}
        {renderTabSelector()}

        <View className="px-5">
          {/* Main Chart Card */}
          {renderActiveChart()}

          {/* Weekly Summary (Combined Goals + Highlights) */}
          {renderWeeklySummary()}
        </View>

        <View className="mb-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
