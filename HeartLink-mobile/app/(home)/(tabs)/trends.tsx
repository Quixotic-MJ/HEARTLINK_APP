import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiFetch } from "../../../lib/api";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { useDs } from "../../../components/onboarding/useDs";
import { IconBadge } from "../../../components/onboarding/QuestionLayout";
let isCurrentlySharing = false;
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useUser } from "../../../contexts/UserContext";
import { Header } from "../../../components/Header";
import { ds } from "../../../constants/theme";

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
  const { c, isDark } = useDs();
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
      const res = await apiFetch(`/api/analytics/${userId}?days=${intervalDays}`, {
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
              body { font-family: Helvetica, sans-serif; padding: 40px; color: ${ds.light.ink}; }
              h1 { color: ${ds.light.primary}; }
              h2 { font-size: 18px; margin-top: 20px; border-bottom: 1px solid ${ds.light.hairline}; padding-bottom: 5px; }
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
  // Design-system card: white, thin warm-grey border, 12px corners, no shadow.
  const card = { backgroundColor: c.canvas, borderColor: c.hairline, borderWidth: 1, borderRadius: 12 };
  const microLabel = { fontSize: 11, fontWeight: "600" as const, letterSpacing: 1, textTransform: "uppercase" as const, color: c.steel };

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
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            className="justify-center"
            style={{
              height: 40,
              paddingHorizontal: 16,
              borderRadius: 9999,
              borderWidth: 1,
              backgroundColor: isActive ? c.ink : c.canvas,
              borderColor: isActive ? c.ink : c.hairline,
            }}
          >
            <Text
              style={{ fontSize: 14, fontWeight: "500", color: isActive ? c.canvas : c.charcoal }}
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
      <View className="p-5 mb-4" style={{ borderRadius: 12, backgroundColor: c.surface }}>
        <Text style={[microLabel, { marginBottom: 14 }]}>
          {intervalDays === 7 ? "THIS WEEK" : intervalDays === 14 ? "LAST 2 WEEKS" : "LAST 30 DAYS"}
        </Text>
        <View className="flex-row justify-between mb-6 gap-2">
          {[
            { key: "sleep", label: "Sleep", icon: "power-sleep", ratio: Number(summaryStats.sleepHours) / 8, value: summaryStats.sleepHours, unit: "/8hr" },
            { key: "activity", label: "Activity", icon: "run", ratio: summaryStats.activityMins / 30, value: summaryStats.activityMins, unit: "/30m" },
            { key: "sodium", label: "Sodium", icon: "shaker-outline", ratio: summaryStats.sodiumMg / 2000, value: summaryStats.sodiumMg, unit: "/2g" },
          ].map((s) => (
            <View key={s.key} className="flex-1 p-3" style={card}>
              <View className="flex-row items-center gap-1.5 mb-2.5">
                <MaterialCommunityIcons name={s.icon as any} size={15} color={c.charcoal} />
                <Text style={{ fontSize: 13, fontWeight: "500", color: c.ink }}>{s.label}</Text>
              </View>
              <View className="w-full overflow-hidden mb-2.5" style={{ height: 4, borderRadius: 2, backgroundColor: c.hairlineSoft }}>
                <View style={{ height: "100%", backgroundColor: c.line, width: `${Math.min(100, s.ratio * 100)}%` }} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>{s.value}<Text style={{ fontSize: 12, fontWeight: "400", color: c.slate }}>{s.unit}</Text></Text>
            </View>
          ))}
        </View>

        <Text style={[microLabel, { marginBottom: 14 }]}>Highlights</Text>

        <TouchableOpacity activeOpacity={0.7} className="flex-row items-center justify-between p-4 mb-2" style={card}>
          <View className="flex-row items-center gap-3 flex-1">
            <IconBadge icon="trophy-outline" tint="mint" size={40} />
            <View className="flex-1">
              <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink, marginBottom: 2 }}>Best day</Text>
              <Text style={{ fontSize: 13, color: c.slate }}>{highlights.bestDayText}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={c.steel} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} className="flex-row items-center justify-between p-4" style={card}>
          <View className="flex-row items-center gap-3 flex-1">
            <IconBadge icon="shaker-outline" tint="peach" size={40} />
            <View className="flex-1">
              <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink, marginBottom: 2 }}>Highest sodium</Text>
              <Text style={{ fontSize: 13, color: c.slate }}>{highlights.highestSodiumText}</Text>
            </View>
          </View>
          <Feather name="chevron-right" size={16} color={c.steel} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderActiveChart = () => {
    const CHART_HEIGHT = 160;
    const CHART_PADDING = 12;
    const color = c.line;
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
      <View className="p-5 mb-4" style={card}>

        {/* Metric Header */}
        <View className="flex-row items-start justify-between mb-4">
          <View>
            <Text style={[microLabel, { marginBottom: 6 }]}>
              {activeTab === "score" ? "Latest Heart Score" : activeTab === "bp" ? "Latest BP" : activeTab === "bpm" ? "Latest Resting HR" : "Total Sodium (Today)"}
            </Text>
            <View className="flex-row items-baseline">
              <Text style={{ fontSize: 36, lineHeight: 40, fontWeight: "600", letterSpacing: -0.5, color: c.ink }}>
                {activeTab === "score" 
                  ? (latestHSS ?? "--") 
                  : activeTab === "bp" 
                    ? (analytics?.vitals?.filter((v:any)=>v.type==="bp").slice(-1)[0] ? `${analytics.vitals.filter((v:any)=>v.type==="bp").slice(-1)[0].systolic}/${analytics.vitals.filter((v:any)=>v.type==="bp").slice(-1)[0].diastolic}` : "--/--") 
                    : activeTab === "bpm"
                      ? (analytics?.vitals?.filter((v:any)=>v.type==="heart_rate" || v.type==="bpm").slice(-1)[0]?.value ?? "--")
                      : (chartData[chartData.length - 1]?.value ?? "--")
                }
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "500", color: c.slate, marginLeft: 6 }}>
                {activeTab === "score" ? "/ 100" : activeTab === "bp" ? "mmHg" : activeTab === "bpm" ? "bpm" : "mg"}
              </Text>
            </View>
          </View>

          <View className="items-end">
            <Text style={[microLabel, { marginBottom: 6 }]}>
              {intervalDays === 7 ? "THIS WEEK" : intervalDays === 14 ? "LAST 2 WEEKS" : "LAST 30 DAYS"}
            </Text>
            <View className="flex-row items-center" style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: c.mint }}>
              <Feather name={activeTab === "score" ? "trending-up" : "trending-down"} size={12} color={c.charcoal} />
              <Text style={{ fontSize: 13, fontWeight: "600", marginLeft: 4, color: c.charcoal }}>
                {activeTab === "score" ? "+5% vs last" : activeTab === "bp" ? "-2% vs last" : activeTab === "bpm" ? "-3% vs last" : "Under limit"}
              </Text>
            </View>
          </View>
        </View>

        {/* Time Interval Selector */}
        <View className="flex-row p-1 mb-4" style={{ borderRadius: 8, backgroundColor: c.surface }}>
          {([7, 14, 30] as const).map((days) => {
            const isActive = intervalDays === days;
            const label = `${days}D`;
            return (
              <TouchableOpacity
                key={days}
                onPress={() => { Haptics.selectionAsync(); setIntervalDays(days); }}
                activeOpacity={0.7}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                className="flex-1 items-center justify-center"
                style={{
                  height: 36,
                  borderRadius: 6,
                  borderWidth: 1,
                  backgroundColor: isActive ? c.canvas : "transparent",
                  borderColor: isActive ? c.hairline : "transparent",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "500", color: isActive ? c.ink : c.steel }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SVG CHART AREA / EMPTY STATE */}
        {activeTab === "sodium" ? (
          <View className="h-44 items-center justify-center mb-4 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: c.hairlineSoft }}>
            <View style={{ marginBottom: 12 }}>
              <IconBadge icon="food-apple-outline" tint="peach" size={44} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink, marginBottom: 4 }}>No Sodium Data</Text>
            <Text className="text-center mb-3 px-4" style={{ fontSize: 13, color: c.slate }}>You haven&apos;t logged any meals in this timeframe.</Text>
            <TouchableOpacity onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} className="justify-center" style={{ height: 40, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: c.hairlineStrong }}>
              <Text style={{ fontSize: 14, fontWeight: "500", color: c.ink }}>Log a Meal</Text>
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
                    stroke={c.hairline}
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
                      fill={c.canvas}
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
                      className="text-center absolute"
                      style={{ left: x - 25, width: 50, top: 0, fontSize: 11, fontWeight: "500", color: c.steel }}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.line} />}
      >
        {/* Screen Header */}
        <View className="px-5 mb-5 mt-2 flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, fontWeight: "600", letterSpacing: -0.5, color: c.ink, marginBottom: 4 }}>
              Trends
            </Text>
            <Text className="flex-shrink" style={{ fontSize: 15, color: c.slate }} numberOfLines={2}>
              Analyze your vitals & discover patterns.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleExportPDF}
            accessibilityRole="button"
            accessibilityLabel="Share trends report"
            className="items-center justify-center"
            style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}
          >
            <Feather name="share-2" size={18} color={c.ink} />
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
