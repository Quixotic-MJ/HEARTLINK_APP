import React, { useState, useCallback, useEffect } from "react";
import { apiFetch } from "../../../lib/api";
import { View, Text, ScrollView, TouchableOpacity, Animated, RefreshControl } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken } from "../../../lib/secureTokenStore";
import { Header } from "../../../components/Header";
import { useUser } from "../../../contexts/UserContext";

import { useDs } from "../../../components/onboarding/useDs";
import { BadgeTint, IconBadge, InfoNote } from "../../../components/onboarding/QuestionLayout";
import DsButton from "../../../components/onboarding/DsButton";
let isCurrentlySharing = false;
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { ds } from "../../../constants/theme";

// Report colours (the PDF is always light).
const P = ds.light;

// ─── Skeletons ────────────────────────────────────────────────────────────────
function SkeletonPulse({ style, className }: any) {
  const [anim] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [anim]);

  return <Animated.View style={[{ opacity: anim }, style]} className={`bg-ds-surface-alt ${className}`} />;
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
  const { c } = useDs();
  return (
    <View className="mb-3 mt-4">
      <Text accessibilityRole="header" style={{ fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", color: c.steel }}>
        {title}
      </Text>
    </View>
  );
}

function MetricCard({ title, value, icon, tint }: { title: string, value: string, icon: any, tint: BadgeTint }) {
  const { c } = useDs();
  return (
    <View className="flex-1 p-4 flex-row items-center" style={{ borderRadius: 12, backgroundColor: c.surface }}>
      <View style={{ marginRight: 12 }}>
        <IconBadge icon={icon} tint={tint} size={40} />
      </View>
      <View className="flex-1">
        <Text style={{ fontSize: 12, fontWeight: "500", color: c.slate, marginBottom: 2 }}>{title}</Text>
        <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{value}</Text>
      </View>
    </View>
  );
}

function DailyRecordRowFlat({ dayData, isToday, isLast }: any) {
  const { c } = useDs();
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
    <View className="flex-row justify-between items-center py-4" style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.hairlineSoft }}>
      <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink }}>
        {dayData.date} - {dayData.day}
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: dayData.has_records || isToday ? "600" : "400",
          color: isToday ? c.ink : (summary.includes("Symptoms") ? c.warmText : (dayData.has_records ? c.charcoal : c.steel))
        }}
      >
        {isToday ? "Today" : summary}
      </Text>
    </View>
  );
}

function LogItemCard({ title, subtitle, icon, tint, onPress }: any) {
  const { c } = useDs();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={`Log ${title}. ${subtitle}`} className="p-4 flex-row items-center justify-between mb-2" style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}>
      <View className="flex-row items-center flex-1">
        <View style={{ marginRight: 14 }}>
          <IconBadge icon={icon} tint={tint} size={40} />
        </View>
        <View className="flex-1 pr-2">
          <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink, marginBottom: 2 }}>{title}</Text>
          <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate }}>{subtitle}</Text>
        </View>
      </View>
      <View className="items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: c.hairlineStrong }}>
        <Feather name="plus" size={16} color={c.ink} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WrapUpScreen() {
  const router = useRouter();
  const { c, isDark } = useDs();
  const insets = useSafeAreaInsets();
  
  const { userId, user, token } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isOfflineData, setIsOfflineData] = useState(false);
  // HL-079: the summary couldn't load and nothing was saved on the phone to show instead
  const [loadFailed, setLoadFailed] = useState(false);

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
      const effectiveToken = token || (await getToken()) || "";
      const response = await apiFetch(`/api/dashboard/wrapup?local_date=${localDate}`, {
        headers: { "Authorization": `Bearer ${effectiveToken}` }
      });
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setIsOfflineData(false);
        setLoadFailed(false);
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
                ${!r.has_records ? `<p style="color:${P.steel}; font-size: 13px;">No records</p>` : `
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
                <strong style="color: ${P.slate}; font-size: 12px; text-transform: uppercase;">${escapeHtml(r.date)} · ${escapeHtml(r.time)}</strong><br>
                Blood Pressure: <strong>${Number(r.systolic || 0)} / ${Number(r.diastolic || 0)} mmHg</strong><br>
                Heart Rate: <strong>${Number(r.bpm || 0)} BPM</strong>
                ${r.weight_kg ? `<br>Weight: <strong>${Number(r.weight_kg).toFixed(1)} kg</strong>` : ''}
              </div>
            `).join('') : `<p style="color:${P.steel};">Not recorded</p>`}

            <h2>SLEEP TIMELINE</h2>
            ${data.sleep.records.length ? data.sleep.records.map((r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: ${P.slate}; font-size: 12px; text-transform: uppercase;">${escapeHtml(r.date)}</strong><br>
                Duration: <strong>${Number(r.hours || 0)}h</strong><br>
                Quality: <strong>${escapeHtml(r.quality)}</strong>
              </div>
            `).join('') : `<p style="color:${P.steel};">No sleep records were logged during this period.</p>`}

            <h2>SYMPTOM TIMELINE</h2>
            ${data.symptoms.records.length ? data.symptoms.records.map((r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: ${P.slate}; font-size: 12px; text-transform: uppercase;">${escapeHtml(r.date)} · ${escapeHtml(r.time)}</strong><br>
                <strong>${escapeHtml(r.name)}</strong><br>
                Severity: <strong>${Number(r.severity || 0)}/10</strong><br>
                Context: <strong>${escapeHtml(r.context || 'Not specified')}</strong>
              </div>
            `).join('') : `<p style="color:${P.steel};">Not recorded</p>`}

            <h2>EXERCISE TIMELINE</h2>
            ${data.movement.records.length ? data.movement.records.map((r: any) => `
              <div style="margin-bottom: 16px; font-size: 13px;">
                <strong style="color: ${P.slate}; font-size: 12px; text-transform: uppercase;">${escapeHtml(r.date)} · ${escapeHtml(r.time)}</strong><br>
                <strong>${escapeHtml(r.name)}</strong><br>
                Duration: ${Number(r.duration || 0)} min<br>
                Type: ${escapeHtml(r.type)}<br>
                Intensity: ${escapeHtml(r.intensity)}<br>
                Goal: ${escapeHtml(r.goal)}<br>
                Status: ${escapeHtml(r.status)}<br>
                ${r.instructions && r.instructions.length ? `<div style="margin-top: 4px; color: ${P.slate};"><em>How it was performed:</em><br> ${r.instructions.map((ins: string, i: number) => `${i+1}. ${escapeHtml(ins)}`).join('<br>')}</div>` : ''}
              </div>
            `).join('') : `<p style="color:${P.steel};">Not recorded</p>`}

            <h2>MEAL TIMELINE</h2>
            ${data.nutrition.records.length ? data.nutrition.records.map((r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: ${P.slate}; font-size: 12px; text-transform: uppercase;">${escapeHtml(r.date)} · ${escapeHtml(r.time)}</strong><br>
                <strong>${escapeHtml(r.meal_name)}</strong><br>
                ${Number(r.calories || 0)} kcal<br>
                ${Number(r.sodium_mg || 0)} mg sodium
              </div>
            `).join('') : `<p style="color:${P.steel};">Not recorded</p>`}

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

      if (isCurrentlySharing) return; isCurrentlySharing = true; try { await Sharing.shareAsync(newUri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Share Weekly Report' }); } finally { setTimeout(() => { isCurrentlySharing = false; }, 1000); }
    } catch (error) {
      console.error(error);
      alert("Failed to generate report.");
    }
  };

  if (!data && loadFailed && !isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
        <Header />
        <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 14 }}>
          <InfoNote icon="wifi-off" title="Your summary couldn't load" text="Check your connection, then try again. Your logs are safe." />
          <DsButton label="Try again" variant="secondary" onPress={() => fetchData()} block />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
        <Header />
        <WrapUpSkeleton />
      </SafeAreaView>
    );
  }

  const todayRecord = data?.daily_records?.[data.daily_records.length - 1];
  const todayMealsSodium = todayRecord?.nutrition?.reduce((sum: number, m: any) => sum + Number(m.sodium_mg || 0), 0) || 0;
  const todayMovementMins = todayRecord?.movement?.reduce((sum: number, m: any) => sum + Number(m.duration || 0), 0) || 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Header />

      <ScrollView
        contentContainerClassName="px-5 pb-40 pt-4 md:max-w-2xl lg:max-w-4xl mx-auto w-full"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.line} />}
      >
        {isOfflineData && (
          <View className="px-4 py-3 mb-4 flex-row items-center gap-2" style={{ borderRadius: 12, backgroundColor: c.yellow }}>
            <Feather name="wifi-off" size={16} color={c.warmText} />
            <Text className="flex-1" style={{ fontSize: 13, fontWeight: "500", color: c.warmText }}>
              Showing cached consultation report. Connect to the internet to update latest telemetry.
            </Text>
          </View>
        )}

        {/* HERO / WEEK HEADER */}
        <View className="mb-6 pt-2">
          <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 1, textTransform: "uppercase", color: c.steel, marginBottom: 6 }}>
            Your Week
          </Text>
          <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 34, fontWeight: "600", letterSpacing: -0.5, color: c.ink, marginBottom: 8 }}>
            {data.date_range.display}
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 23, color: c.slate }}>
            A chronological record of your health activity this week.
          </Text>
        </View>



        {/* GLANCE GRID */}
        <View className="mb-8">
          <View className="flex-row gap-3 mb-3">
            <MetricCard 
              title="Avg. stability" 
              value={data.overview.hss_average ?? "No data"}
              icon="heart-outline"
              tint="sky"
            />
            <MetricCard
              title="Movement"
              value={data.overview.movement_minutes ? `${data.overview.movement_minutes} min` : "No data"}
              icon="walk"
              tint="mint"
            />
          </View>
          <View className="flex-row gap-3">
            <MetricCard 
              title="Sleep" 
              value={data.overview.sleep_average_hours ? `${data.overview.sleep_average_hours} hr` : "No data"}
              icon="power-sleep"
              tint="lavender"
            />
            <MetricCard
              title="Vitals logged"
              value={`${data.overview.vital_days} of 7 days`}
              icon="pulse"
              tint="sky"
            />
          </View>
        </View>

        {/* SYMPTOMS THIS WEEK */}
        {data.symptoms?.records?.length > 0 && (
          <View className="mb-8">
            <SectionTitle title="Symptoms This Week" />
            {data.symptoms.records.map((symptom: any, index: number) => (
              <View key={index} className="p-4 mb-2" style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}>
                 <View className="flex-row gap-3">
                    <View className="mt-0.5">
                      <Feather name="alert-circle" size={16} color={c.warmText} />
                    </View>
                    <View className="flex-1">
                       <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink, marginBottom: 4 }}>{symptom.name} - {symptom.date}</Text>
                       <Text style={{ fontSize: 13, lineHeight: 19, color: c.slate }}>
                         Severity: {symptom.severity}/10. {symptom.context || ""}
                       </Text>
                    </View>
                 </View>
              </View>
            ))}
          </View>
        )}

        {/* DAILY RECORD TIMELINE */}
        <View className="mb-8">
          <SectionTitle title="Daily Record" />
          <View className="px-5" style={{ borderRadius: 12, backgroundColor: c.surface }}>
            {data.daily_records.map((dayData: any, idx: number) => {
              const isToday = idx === data.daily_records.length - 1;
              return <DailyRecordRowFlat key={idx} dayData={dayData} isToday={isToday} isLast={isToday} />;
            })}
          </View>
        </View>

        {/* LOG A RECORD */}
        <View className="mb-8">
          <SectionTitle title="Log a Record" />
          <View>
            <LogItemCard 
              title="Blood pressure" 
              subtitle="Morning check due today"
              icon="heart-pulse"
              tint="sky"
              onPress={() => router.push("/(home)/(health)/log-symptoms")} 
            />
            <LogItemCard 
              title="Meals" 
              subtitle={`${todayMealsSodium.toLocaleString()} of 2,000 mg logged today`}
              icon="silverware-fork-knife"
              tint="peach"
              onPress={() => router.push("/(home)/(meals)/food-diary")} 
            />
            <LogItemCard 
              title="Movement" 
              subtitle={`${todayMovementMins} of 30 mins completed today`}
              icon="walk"
              tint="mint"
              onPress={() => router.push("/(home)/(health)/exercise-diary")} 
            />
            <LogItemCard 
              title="Sleep" 
              subtitle="Target: 7-9 hrs of restful recovery"
              icon="power-sleep"
              tint="lavender"
              onPress={() => router.push("/(home)/(health)/log-symptoms")} 
            />
          </View>
        </View>



        {/* DOCTOR REPORT ACTION */}
        <View className="mb-12">
          <AnimatedButton
            onPress={exportReport}
            accessibilityRole="button"
            accessibilityLabel="Doctor consultation summary"
            className="p-4 flex-row items-center"
            style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}
          >
            <View style={{ marginRight: 14 }}>
              <IconBadge icon="file-document-outline" tint="sky" size={40} />
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: 16, fontWeight: "500", color: c.ink, marginBottom: 2 }}>
                Doctor consultation summary
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "500", color: c.warmText }}>
                Includes this week&apos;s flagged review
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color={c.steel} />
          </AnimatedButton>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

