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
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useUser } from "../../../contexts/UserContext";
import { Header } from "../../../components/Header";

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
        label: intervalDays <= 7 ? d.toLocaleDateString("en-US", { weekday: 'short' }) : d.getDate().toString(),
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
        await Sharing.shareAsync(uri);
      }
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const latestHSS = analytics?.history?.[analytics.history.length - 1]?.score ?? null;
  const activeTheme = getStatusTheme(latestHSS, isDark);

  // ─── Sub-components for Content ──────────────────────────────────────────
  
  const renderTabSelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" contentContainerStyle={{ paddingHorizontal: 20 }}>
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
            className={`px-4 py-2 rounded-full mr-2 border ${isActive ? "border-transparent" : (isDark ? "border-slate-800" : "border-slate-200")}`}
            style={{ backgroundColor: isActive ? (isDark ? TOKENS.teal : TOKENS.teal) : (isDark ? "#1C2A3A" : "#FFFFFF") }}
          >
            <Text className={`text-[13px] font-semibold ${isActive ? "text-white" : (isDark ? "text-slate-300" : "text-slate-600")}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderDailyGoals = () => {
    return (
      <View className="flex-row justify-between mb-4">
        {/* Metric 1 */}
        <View className="flex-1 bg-surface-card rounded-xl p-3 mr-2 border border-slate-100 dark:border-slate-800/60">
          <Text className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">Sleep</Text>
          <View className="h-1 bg-slate-200 dark:bg-slate-700/50 rounded-full w-full overflow-hidden mb-2">
            <View className="h-full rounded-full" style={{ width: '70%', backgroundColor: TOKENS.indigo }} />
          </View>
          <Text className="text-[14px] font-bold text-[#152131] dark:text-white">6.5<Text className="text-[11px] font-medium text-slate-500">/8hr</Text></Text>
        </View>
        {/* Metric 2 */}
        <View className="flex-1 bg-surface-card rounded-xl p-3 mr-2 border border-slate-100 dark:border-slate-800/60">
          <Text className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">Activity</Text>
          <View className="h-1 bg-slate-200 dark:bg-slate-700/50 rounded-full w-full overflow-hidden mb-2">
            <View className="h-full rounded-full" style={{ width: '60%', backgroundColor: TOKENS.teal }} />
          </View>
          <Text className="text-[14px] font-bold text-[#152131] dark:text-white">6.2k<Text className="text-[11px] font-medium text-slate-500">/10k</Text></Text>
        </View>
        {/* Metric 3 */}
        <View className="flex-1 bg-surface-card rounded-xl p-3 border border-slate-100 dark:border-slate-800/60">
          <Text className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-2">Sodium</Text>
          <View className="h-1 bg-slate-200 dark:bg-slate-700/50 rounded-full w-full overflow-hidden mb-2">
            <View className="h-full rounded-full" style={{ width: '40%', backgroundColor: TOKENS.orange }} />
          </View>
          <Text className="text-[14px] font-bold text-[#152131] dark:text-white">760<Text className="text-[11px] font-medium text-slate-500">/2g</Text></Text>
        </View>
      </View>
    );
  };

  const renderActiveChart = () => {
    const CHART_HEIGHT = 160;
    const CHART_PADDING = 12;
    const color = activeTab === "score" ? TOKENS.teal : activeTab === "bp" ? TOKENS.pink : activeTab === "bpm" ? TOKENS.orange : TOKENS.indigo;
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
      <View className="bg-surface-card rounded-2xl p-5 mb-4 border border-slate-100 dark:border-slate-800/60">
        
        {/* Metric Header */}
        <View className="flex-row items-start justify-between mb-4">
          <View>
            <Text className="text-[12px] font-semibold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider mb-1">
              {activeTab === "score" ? "Latest Heart Score" : activeTab === "bp" ? "Latest BP" : activeTab === "bpm" ? "Latest Resting HR" : "Total Sodium (Today)"}
            </Text>
            <View className="flex-row items-baseline">
              <Text className="text-[38px] font-bold text-[#152131] dark:text-white tracking-tight leading-none">
                {activeTab === "score" 
                  ? (latestHSS ?? "--") 
                  : activeTab === "bp" 
                    ? (analytics?.vitals?.filter((v:any)=>v.type==="bp").slice(-1)[0] ? `${analytics.vitals.filter((v:any)=>v.type==="bp").slice(-1)[0].systolic}/${analytics.vitals.filter((v:any)=>v.type==="bp").slice(-1)[0].diastolic}` : "--/--") 
                    : activeTab === "bpm"
                      ? (analytics?.vitals?.filter((v:any)=>v.type==="heart_rate" || v.type==="bpm").slice(-1)[0]?.value ?? "--")
                      : (chartData[chartData.length - 1]?.value ?? "--")
                }
              </Text>
              <Text className="text-[14px] font-medium text-[#5C6B66] dark:text-slate-400 ml-1.5">
                {activeTab === "score" ? "/ 100" : activeTab === "bp" ? "mmHg" : activeTab === "bpm" ? "bpm" : "mg"}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text className="text-[12px] font-semibold text-[#5C6B66] dark:text-slate-400 uppercase tracking-wider mb-1">
              This Week
            </Text>
            <View className="flex-row items-center">
              <Feather name={activeTab === "score" ? "trending-up" : "trending-down"} size={14} color={activeTab === "score" ? TOKENS.teal : TOKENS.teal} />
              <Text className="text-[13px] font-bold ml-1" style={{ color: activeTab === "score" ? TOKENS.teal : TOKENS.teal }}>
                {activeTab === "score" ? "+5% vs last" : activeTab === "bp" ? "-2% vs last" : activeTab === "bpm" ? "-3% vs last" : "Under limit"}
              </Text>
            </View>
          </View>
        </View>

        {/* Time Interval Selector */}
        <View className="flex-row p-1 rounded-xl mb-4" style={{ backgroundColor: isDark ? "rgba(148,163,184,0.1)" : TOKENS.neutralSoft }}>
          {([7, 14, 30] as const).map((days) => {
            const isActive = intervalDays === days;
            const label = `${days}D`;
            return (
              <TouchableOpacity
                key={days}
                onPress={() => { Haptics.selectionAsync(); setIntervalDays(days); }}
                activeOpacity={0.7}
                className="flex-1 py-2 items-center rounded-lg"
                style={isActive ? { backgroundColor: isDark ? "#1C2A3A" : "#FFFFFF" } : undefined}
              >
                <Text className="text-[12px] font-semibold tracking-tight" style={{ color: isActive ? (isDark ? "#FFFFFF" : TOKENS.ink) : (isDark ? TOKENS.subDark : TOKENS.sub) }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SVG CHART AREA / EMPTY STATE */}
        {activeTab === "sodium" ? (
          <View className="h-44 items-center justify-center border-b border-[#DCE3DF] dark:border-slate-800 mb-4 pb-4">
            <View className="w-12 h-12 rounded-full items-center justify-center mb-3" style={{ backgroundColor: isDark ? "rgba(111,111,209,0.15)" : "rgba(111,111,209,0.1)" }}>
              <MaterialCommunityIcons name="food-apple" size={20} color={TOKENS.indigo} />
            </View>
            <Text className="text-[14px] font-semibold text-[#152131] dark:text-white mb-1">No Sodium Data</Text>
            <Text className="text-[12px] text-center text-slate-500 dark:text-slate-400 mb-3 px-4">You haven't logged any meals in this timeframe.</Text>
            <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} className="px-4 py-2 rounded-full" style={{ backgroundColor: TOKENS.indigo }}>
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
                  {points.map((p, i) => {
                     // Only show dots if it's 7 days, otherwise it's too crowded for 30 days
                     if (intervalDays > 14) return null;
                     return <Circle key={i} cx={p.x} cy={p.y} r={4} fill={color} stroke={isDark ? "#1C2A3A" : "#FFFFFF"} strokeWidth={2} />;
                  })}
                </Svg>
              )}
            </View>
            <View className="flex-row items-center justify-between px-2">
              {chartData.map((d, i) => {
                const showLabel = intervalDays === 7 || (intervalDays === 14 && (i + 1) % 3 === 0) || (intervalDays === 30 && (i + 1) % 5 === 0);
                return (
                  <Text key={i} className="text-[10px] text-slate-400 font-medium" style={{ opacity: showLabel ? 1 : 0, width: 24, textAlign: 'center' }}>
                    {d.label}
                  </Text>
                );
              })}
            </View>
          </View>
        )}


      </View>
    );
  };

  const renderHighlights = () => (
    <View className="px-5 mb-8">
      <TouchableOpacity activeOpacity={0.7} className="flex-row items-center justify-between p-4 bg-surface-card rounded-2xl border border-slate-100 dark:border-slate-800/60 mb-2">
        <View className="flex-row items-center gap-4">
          <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: isDark ? "rgba(111,111,209,0.15)" : TOKENS.indigoSoft }}>
            <Feather name="activity" size={16} color={TOKENS.indigo} />
          </View>
          <View>
            <Text className="text-[15px] font-bold text-slate-900 dark:text-white mb-0.5">Best day</Text>
            <Text className="text-[13px] text-slate-500 dark:text-slate-400">Wednesday, 120/80 mmHg</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={isDark ? "#64748B" : "#94A3B8"} />
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.7} className="flex-row items-center justify-between p-4 bg-surface-card rounded-2xl border border-slate-100 dark:border-slate-800/60">
        <View className="flex-row items-center gap-4">
          <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: isDark ? "rgba(178,58,58,0.15)" : TOKENS.criticalSoft }}>
            <Feather name="alert-triangle" size={16} color={TOKENS.critical} />
          </View>
          <View>
            <Text className="text-[15px] font-bold text-slate-900 dark:text-white mb-0.5">Highest sodium</Text>
            <Text className="text-[13px] text-slate-500 dark:text-slate-400">Saturday, 2,140mg</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={18} color={isDark ? "#64748B" : "#94A3B8"} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-[#0B121C]">
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.teal} />}
      >
        {/* Screen Header */}
        <View className="px-5 mb-5 mt-2 flex-row items-center justify-between">
          <View>
            <Text className="text-[28px] font-bold text-[#152131] dark:text-white tracking-tight mb-1">
              Trends
            </Text>
            <Text className="text-[14px] text-slate-500 dark:text-slate-400">
              Analyze your vitals and discover patterns.
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={handleExportPDF} className="w-10 h-10 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800">
              <Feather name="share" size={18} color={isDark ? "#FFFFFF" : TOKENS.ink} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/(home)/(health)/log-symptoms");
              }} 
              className="w-10 h-10 rounded-full items-center justify-center" 
              style={{ backgroundColor: TOKENS.teal }}
            >
              <Feather name="plus" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Selector */}
        {renderTabSelector()}

        <View className="px-5">
          {/* Main Chart Card */}
          {renderActiveChart()}

          {/* Daily Goals / Sub Metrics */}
          {renderDailyGoals()}
        </View>

        {/* Highlights */}
        {renderHighlights()}

        <View className="mb-20" />
      </ScrollView>
    </SafeAreaView>
  );
}