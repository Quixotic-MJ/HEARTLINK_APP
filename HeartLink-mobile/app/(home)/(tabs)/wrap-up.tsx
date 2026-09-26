import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Animated, RefreshControl, LayoutAnimation, Platform, UIManager } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { useColorScheme } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Header } from "../../../components/Header";
import { useUser } from "../../../contexts/UserContext";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { Colors } from "../../../constants/theme";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Skeletons ────────────────────────────────────────────────────────────────
function SkeletonPulse({ style, className }: any) {
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [anim]);

  return <Animated.View style={[{ opacity: anim }, style]} className={`bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

function WrapUpSkeleton() {
  return (
    <View className="px-6 pt-6 gap-6">
      <View>
        <SkeletonPulse className="w-32 h-6 rounded-md mb-2" />
        <SkeletonPulse className="w-48 h-8 rounded-md" />
      </View>
      <View className="gap-4 mt-6">
        {[1,2,3,4,5].map(i => <SkeletonPulse key={i} className="w-full h-24 rounded-xl" />)}
      </View>
    </View>
  );
}

// ─── Reusable Components ──────────────────────────────────────────────────────
function SectionTitle({ title }: { title: string }) {
  return (
    <View className="mb-2 mt-4">
      <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 tracking-[0.08em] uppercase">
        {title}
      </Text>
    </View>
  );
}

function MetricCard({ title, value, icon, color }: { title: string, value: string, icon: any, color: string }) {
  return (
    <View className="flex-1 bg-slate-100/50 dark:bg-slate-800/40 rounded-2xl p-4 flex-row items-center border-0">
      <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: `${color}15` }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-0.5 uppercase tracking-wide">{title}</Text>
        <Text className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight">{value}</Text>
      </View>
    </View>
  );
}

function DailyRecordRowFlat({ dayData, isToday }: any) {
  const summary = dayData.has_records 
    ? [
        dayData.movement.length ? "Exercise" : null,
        dayData.nutrition.length ? "Meals" : null,
        dayData.vitals.length ? "Vitals" : null,
        dayData.sleep.length ? "Sleep" : null,
        dayData.symptoms.length ? "Symptoms" : null
      ].filter(Boolean).join(" · ")
    : "No records";

  return (
    <View className="flex-row justify-between items-center py-4 border-b border-slate-200 dark:border-slate-800/60 last:border-b-0">
      <Text className="text-[14px] font-semibold text-slate-900 dark:text-slate-200">
        {dayData.date} - {dayData.day}
      </Text>
      <Text className={`text-[13px] font-medium ${isToday ? "text-blue-500 font-bold" : "text-slate-400 dark:text-slate-500"}`}>
        {isToday ? "Today" : summary}
      </Text>
    </View>
  );
}

function LogItemRow({ title, icon, color, onPress }: any) {
  return (
    <View className="flex-row items-center justify-between py-4 border-b border-slate-200 dark:border-slate-800/60 last:border-b-0">
      <View className="flex-row items-center">
        <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: `${color}15` }}>
          <Feather name={icon} size={18} color={color} />
        </View>
        <Text className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</Text>
      </View>
      <TouchableOpacity onPress={onPress} className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: color }}>
        <Feather name="plus" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WrapUpScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  
  const activeTint = Colors[isDark ? "dark" : "light"].tint;
  
  const { userId, user, token } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isOfflineData, setIsOfflineData] = useState(false);

  const wrapupCacheKey = userId ? `@wrapup_cache_${userId}` : null;

  const fetchData = useCallback(async (silent = false) => {
    if (!userId) return;

    // HL-ENG-27: Hydrate from scoped cache for instant offline rendering
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
      const localDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const effectiveToken = token || (await AsyncStorage.getItem("access_token")) || "";
      const response = await fetch(`${base_url}/api/dashboard/wrapup?local_date=${localDate}`, {
        headers: { "Authorization": `Bearer ${effectiveToken}` }
      });
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setIsOfflineData(false);
        if (wrapupCacheKey) {
          await AsyncStorage.setItem(wrapupCacheKey, JSON.stringify(result));
        }
      }
    } catch (error) {
      console.error("Wrap-up fetch error:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId, wrapupCacheKey, token]);

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
      const patientName = `${escapeHtml(user?.first_name || 'User')} ${escapeHtml(user?.last_name || '')}`.trim();
      const periodDisplay = escapeHtml(data.date_range.display);
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
              h1 { font-size: 24px; font-weight: bold; margin-bottom: 4px; color: #0f172a; }
              h2 { font-size: 16px; font-weight: bold; color: #334155; margin-top: 32px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
              h3 { margin-bottom: 8px; font-size: 14px; text-transform: uppercase; color: #0f172a; }
              p { margin: 0 0 16px 0; color: #475569; font-size: 14px; }
              .details { margin-bottom: 32px; font-size: 14px; background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
              table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 24px; font-size: 14px; }
              th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; }
              th { background-color: #f1f5f9; font-weight: bold; color: #475569; }
              td { color: #334155; }
              .highlight { font-weight: bold; color: #0f172a; }
              .subtext { font-size: 12px; color: #64748b; }
              .record-card { margin-bottom: 16px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; }
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
              <tr><td>Average recorded stability score</td><td class="highlight">${escapeHtml(data.overview.hss_average ?? 'Not recorded')}</td></tr>
              <tr><td>Movement</td><td class="highlight">${Number(data.overview.movement_minutes || 0)} min</td></tr>
              <tr><td>Meals</td><td class="highlight">${Number(data.overview.meal_days || 0)} days recorded</td></tr>
              <tr><td>Sleep</td><td class="highlight">${data.overview.sleep_average_hours ? Number(data.overview.sleep_average_hours) + ' hr average' : 'Not recorded'}</td></tr>
              <tr><td>Vitals</td><td class="highlight">${Number(data.overview.vital_days || 0)} readings</td></tr>
              <tr><td>Symptoms</td><td class="highlight">${Number(data.overview.symptom_count || 0)} recorded</td></tr>
            </table>

            <h2>DAILY RECORD</h2>
            ${data.daily_records.map((r: any) => `
              <div class="record-card">
                <h3>${escapeHtml(r.date)}</h3>
                ${!r.has_records ? `<p style="color:#94a3b8; font-size: 13px;">No records</p>` : `
                  ${r.movement.length ? `<p><strong>Movement:</strong><br>${r.movement.map((m: any) => `${escapeHtml(m.name)} — ${Number(m.duration || 0)} min`).join('<br>')}</p>` : ''}
                  ${r.nutrition.length ? `<p><strong>Meals:</strong><br>${r.nutrition.map((m: any) => `${escapeHtml(m.meal_name)} — ${Number(m.calories || 0)} kcal, ${Number(m.sodium_mg || 0)}mg sodium`).join('<br>')}</p>` : ''}
                  ${r.vitals.length ? `<p><strong>Vitals:</strong><br>${r.vitals.map((v: any) => `${Number(v.systolic || 0)}/${Number(v.diastolic || 0)} mmHg — ${Number(v.bpm || 0)} BPM`).join('<br>')}</p>` : ''}
                  ${r.sleep.length ? `<p><strong>Sleep:</strong><br>${r.sleep.map((s: any) => `${Number(s.hours || 0)} hours (Quality: ${escapeHtml(s.quality)})`).join('<br>')}</p>` : ''}
                  ${r.symptoms.length ? `<p><strong>Symptoms:</strong><br>${r.symptoms.map((s: any) => `${escapeHtml(s.name)} (Severity: ${Number(s.severity || 0)}/10)`).join('<br>')}</p>` : ''}
                `}
              </div>
            `).join('')}

            <h2>VITAL TIMELINE</h2>
            ${data.vitals.records.length ? data.vitals.records.map((r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">${escapeHtml(r.date)} · ${escapeHtml(r.time)}</strong><br>
                Blood Pressure: <strong>${Number(r.systolic || 0)} / ${Number(r.diastolic || 0)} mmHg</strong><br>
                Heart Rate: <strong>${Number(r.bpm || 0)} BPM</strong>
                ${r.weight_kg ? `<br>Weight: <strong>${Number(r.weight_kg).toFixed(1)} kg</strong>` : ''}
              </div>
            `).join('') : '<p style="color:#94a3b8;">Not recorded</p>'}

            <h2>SLEEP TIMELINE</h2>
            ${data.sleep.records.length ? data.sleep.records.map((r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">${escapeHtml(r.date)}</strong><br>
                Duration: <strong>${Number(r.hours || 0)}h</strong><br>
                Quality: <strong>${escapeHtml(r.quality)}</strong>
              </div>
            `).join('') : '<p style="color:#94a3b8;">No sleep records were logged during this period.</p>'}

            <h2>SYMPTOM TIMELINE</h2>
            ${data.symptoms.records.length ? data.symptoms.records.map((r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">${escapeHtml(r.date)} · ${escapeHtml(r.time)}</strong><br>
                <strong>${escapeHtml(r.name)}</strong><br>
                Severity: <strong>${Number(r.severity || 0)}/10</strong><br>
                Context: <strong>${escapeHtml(r.context || 'Not specified')}</strong>
              </div>
            `).join('') : '<p style="color:#94a3b8;">Not recorded</p>'}

            <h2>EXERCISE TIMELINE</h2>
            ${data.movement.records.length ? data.movement.records.map((r: any) => `
              <div style="margin-bottom: 16px; font-size: 13px;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">${escapeHtml(r.date)} · ${escapeHtml(r.time)}</strong><br>
                <strong>${escapeHtml(r.name)}</strong><br>
                Duration: ${Number(r.duration || 0)} min<br>
                Type: ${escapeHtml(r.type)}<br>
                Intensity: ${escapeHtml(r.intensity)}<br>
                Goal: ${escapeHtml(r.goal)}<br>
                Status: ${escapeHtml(r.status)}<br>
                ${r.instructions && r.instructions.length ? `<div style="margin-top: 4px; color: #475569;"><em>How it was performed:</em><br> ${r.instructions.map((ins: string, i: number) => `${i+1}. ${escapeHtml(ins)}`).join('<br>')}</div>` : ''}
              </div>
            `).join('') : '<p style="color:#94a3b8;">Not recorded</p>'}

            <h2>MEAL TIMELINE</h2>
            ${data.nutrition.records.length ? data.nutrition.records.map((r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">${escapeHtml(r.date)} · ${escapeHtml(r.time)}</strong><br>
                <strong>${escapeHtml(r.meal_name)}</strong><br>
                ${Number(r.calories || 0)} kcal<br>
                ${Number(r.sodium_mg || 0)} mg sodium
              </div>
            `).join('') : '<p style="color:#94a3b8;">Not recorded</p>'}

            <h2>HSS / STABILITY</h2>
            <p>Weekly Average: <strong>${escapeHtml(data.stability.average ?? 'Not recorded')}</strong></p>
            ${data.stability.records.length ? `
              <p>Daily Recorded Scores:</p>
              <ul>
                ${data.stability.records.map((r: any) => `<li>${escapeHtml(r.date)} — ${escapeHtml(r.score)}</li>`).join('')}
              </ul>
            ` : ''}
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

      await Sharing.shareAsync(newUri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Weekly Report' });
    } catch (error) {
      console.error(error);
      alert("Failed to generate report.");
    }
  };

  const activeText = isDark ? "#11181C" : "#ffffff";

  if (isLoading || !data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
        <Header />
        <WrapUpSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      <ScrollView
        contentContainerClassName="px-5 pb-40 pt-4 md:max-w-2xl lg:max-w-4xl mx-auto w-full"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeTint} />}
      >
        {isOfflineData && (
          <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 mb-4 flex-row items-center gap-2">
            <Feather name="wifi-off" size={16} color="#d97706" />
            <Text className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex-1">
              Showing cached consultation report. Connect to the internet to update latest telemetry.
            </Text>
          </View>
        )}

        {/* HERO / WEEK HEADER */}
        <View className="mb-6 pt-2">
          <Text className="text-[12px] font-bold text-slate-500 dark:text-slate-400 tracking-[0.1em] uppercase mb-1">
            Your Week
          </Text>
          <Text className="text-[32px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight mb-2">
            {data.date_range.display}
          </Text>
          <Text className="text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed">
            A chronological record of your health activity this week.
          </Text>
        </View>

        {/* GLANCE GRID */}
        <View className="mb-8">
          <View className="flex-row gap-3 mb-3">
            <MetricCard 
              title="Avg. stability" 
              value={data.overview.hss_average ?? "No data"} 
              icon={<Feather name="heart" size={18} color="#e11d48" />} 
              color="#e11d48" 
            />
            <MetricCard 
              title="Movement" 
              value={data.overview.movement_minutes ? `${data.overview.movement_minutes} min` : "No data"} 
              icon={<Feather name="activity" size={18} color="#f97316" />} 
              color="#f97316" 
            />
          </View>
          <View className="flex-row gap-3">
            <MetricCard 
              title="Sleep" 
              value={data.overview.sleep_average_hours ? `${data.overview.sleep_average_hours} hr` : "No data"} 
              icon={<Feather name="moon" size={18} color="#8b5cf6" />} 
              color="#8b5cf6" 
            />
            <MetricCard 
              title="Vitals" 
              value={`${data.overview.vital_days} days`} 
              icon={<Feather name="droplet" size={18} color="#3b82f6" />} 
              color="#3b82f6" 
            />
          </View>
        </View>

        {/* DAILY RECORD TIMELINE */}
        <View className="mb-8">
          <SectionTitle title="Daily Record" />
          <View className="bg-slate-100/50 dark:bg-slate-800/40 rounded-3xl px-5 border-0">
            {data.daily_records.map((dayData: any, idx: number) => {
              const isToday = idx === data.daily_records.length - 1;
              return <DailyRecordRowFlat key={idx} dayData={dayData} isToday={isToday} />;
            })}
          </View>
        </View>

        {/* LOG A RECORD */}
        <View className="mb-8">
          <SectionTitle title="Log a Record" />
          <View className="bg-slate-100/50 dark:bg-slate-800/40 rounded-3xl px-5 border-0">
            <LogItemRow 
              title="Vital readings" 
              icon="activity" 
              color="#3b82f6" 
              onPress={() => router.push("/(home)/(health)/log-symptoms")} 
            />
            <LogItemRow 
              title="Sleep" 
              icon="moon" 
              color="#8b5cf6" 
              onPress={() => router.push("/(home)/(health)/log-symptoms")} 
            />
            <LogItemRow 
              title="Symptoms" 
              icon="alert-circle" 
              color="#ea580c" 
              onPress={() => router.push("/(home)/(health)/log-symptoms")} 
            />
            <LogItemRow 
              title="Exercise" 
              icon="play" 
              color="#3b82f6" 
              onPress={() => router.push("/(home)/(health)/exercise-diary")} 
            />
            <LogItemRow 
              title="Meals" 
              icon="coffee" 
              color="#d97706" 
              onPress={() => router.push("/(home)/(meals)/food-diary")} 
            />
          </View>
        </View>

        {/* CONSISTENCY */}
        <View className="mb-10 bg-amber-100/80 dark:bg-[#d97706]/20 rounded-3xl p-5 border-0">
          <Text className="text-[12px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-1">
            Your Recording Streak
          </Text>
          <Text className="text-[22px] font-bold text-amber-900 dark:text-amber-400 mb-2">
            🔥 {data.consistency.current_streak} days
          </Text>
          <Text className="text-[14px] text-amber-800 dark:text-amber-200">
            Log something today to start your streak.
          </Text>
        </View>

        {/* DOCTOR REPORT ACTION */}
        <View className="mb-12">
          <AnimatedButton
            onPress={exportReport}
            className="bg-slate-100 dark:bg-slate-800/80 rounded-3xl p-5 border-0 flex-row items-center"
          >
            <View className="w-10 h-10 rounded-xl items-center justify-center mr-4" style={{ backgroundColor: `${activeTint}15` }}>
              <Feather name="file-text" size={20} color={activeTint} />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-slate-900 dark:text-white mb-0.5">
                Export 7-Day Health Report
              </Text>
              <Text className="text-[13px] text-slate-500 dark:text-slate-400">
                Share with your doctor
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#cbd5e1" />
          </AnimatedButton>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
