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
function SectionTitle({ title, icon, color }: { title: string, icon?: any, color?: string }) {
  return (
    <View className="flex-row items-center mb-4">
      {icon && (
        <View className="w-6 h-6 rounded-md items-center justify-center mr-2" style={{ backgroundColor: `${color}15` }}>
          <Feather name={icon} size={14} color={color} />
        </View>
      )}
      <Text className="text-[12px] font-bold text-slate-400 dark:text-slate-500 tracking-[0.08em] uppercase">
        {title}
      </Text>
    </View>
  );
}

function MetricCard({ title, value, icon, color }: { title: string, value: string, icon: any, color: string }) {
  return (
    <View className="flex-1 bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 flex-row items-center">
      <View className="w-10 h-10 rounded-lg items-center justify-center mr-3" style={{ backgroundColor: `${color}15` }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>
      <View>
        <Text className="text-[12px] text-slate-500 dark:text-slate-400 font-medium mb-0.5">{title}</Text>
        <Text className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight">{value}</Text>
      </View>
    </View>
  );
}

function DailyRecordRow({ dayData, activeTint }: any) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View className="mb-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <TouchableOpacity activeOpacity={0.7} onPress={toggleExpand} className="p-4 flex-row justify-between items-center bg-slate-50 dark:bg-slate-800/50">
        <View>
          <Text className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{dayData.date} · {dayData.day}</Text>
          <Text className="text-[14px] font-medium text-slate-800 dark:text-slate-200 mt-0.5">
            {dayData.has_records 
              ? [
                  dayData.movement.length ? "Exercise" : null,
                  dayData.nutrition.length ? "Meals" : null,
                  dayData.vitals.length ? "Vitals" : null,
                  dayData.sleep.length ? "Sleep" : null,
                  dayData.symptoms.length ? "Symptoms" : null
                ].filter(Boolean).join(" · ")
              : "No records"}
          </Text>
        </View>
        <View className="w-8 h-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Feather name={expanded ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="p-4 gap-y-5">
          {!dayData.has_records && (
            <Text className="text-[14px] text-slate-400">No health activity recorded on this day.</Text>
          )}
          
          {dayData.movement.length > 0 && (
             <View>
               <Text className="text-[11px] font-bold text-slate-400 uppercase mb-2">Movement</Text>
               {dayData.movement.map((m: any, i: number) => (
                 <View key={i} className="mb-2">
                   <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">{m.name} — {m.duration} min</Text>
                   <Text className="text-[13px] text-slate-500">{m.type} · {m.intensity} Intensity</Text>
                 </View>
               ))}
             </View>
          )}

          {dayData.nutrition.length > 0 && (
             <View>
               <Text className="text-[11px] font-bold text-slate-400 uppercase mb-2">Meals</Text>
               {dayData.nutrition.map((m: any, i: number) => (
                 <View key={i} className="mb-2">
                   <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">{m.meal_name}</Text>
                   <Text className="text-[13px] text-slate-500">{m.calories} kcal · {m.sodium_mg} mg sodium</Text>
                 </View>
               ))}
             </View>
          )}

          {dayData.vitals.length > 0 && (
             <View>
               <Text className="text-[11px] font-bold text-slate-400 uppercase mb-2">Vitals</Text>
               {dayData.vitals.map((v: any, i: number) => (
                 <View key={i} className="mb-2">
                   <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">{v.time}</Text>
                   <Text className="text-[13px] text-slate-500">{v.systolic}/{v.diastolic} mmHg · {v.bpm} BPM</Text>
                   {v.medication !== undefined && v.medication !== null && (
                     <Text className="text-[12px] text-slate-500 mt-0.5">Medication: {v.medication ? 'Taken' : 'Not taken'}</Text>
                   )}
                 </View>
               ))}
             </View>
          )}

          {dayData.sleep.length > 0 && (
             <View>
               <Text className="text-[11px] font-bold text-slate-400 uppercase mb-2">Sleep</Text>
               {dayData.sleep.map((s: any, i: number) => (
                 <View key={i} className="mb-2">
                   <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">{s.hours} hours</Text>
                   <Text className="text-[13px] text-slate-500">Quality: {s.quality}</Text>
                 </View>
               ))}
             </View>
          )}

          {dayData.symptoms.length > 0 && (
             <View>
               <Text className="text-[11px] font-bold text-slate-400 uppercase mb-2">Symptoms</Text>
               {dayData.symptoms.map((s: any, i: number) => (
                 <View key={i} className="mb-2">
                   <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">{s.name}</Text>
                   <Text className="text-[13px] text-slate-500">Severity: {s.severity}/10 {s.context ? `· ${s.context}` : ''}</Text>
                 </View>
               ))}
             </View>
          )}
        </View>
      )}
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

  const fetchData = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setIsLoading(true);
    
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
      }
    } catch (error) {
      console.error("Wrap-up fetch error:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(true);
  }, [fetchData]);

  const exportReport = async () => {
    if (!data) return;
    try {
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
              <strong>Patient:</strong> ${user?.first_name || 'User'} ${user?.last_name || ''}<br>
              <strong>Period:</strong> ${data.date_range.display}
            </div>
            
            <h2>WEEKLY SUMMARY</h2>
            <table>
              <tr><td>Average recorded stability score</td><td class="highlight">${data.overview.hss_average ?? 'Not recorded'}</td></tr>
              <tr><td>Movement</td><td class="highlight">${data.overview.movement_minutes} min</td></tr>
              <tr><td>Meals</td><td class="highlight">${data.overview.meal_days} days recorded</td></tr>
              <tr><td>Sleep</td><td class="highlight">${data.overview.sleep_average_hours ? data.overview.sleep_average_hours + ' hr average' : 'Not recorded'}</td></tr>
              <tr><td>Vitals</td><td class="highlight">${data.overview.vital_days} readings</td></tr>
              <tr><td>Symptoms</td><td class="highlight">${data.overview.symptom_count} recorded</td></tr>
            </table>

            <h2>DAILY RECORD</h2>
            ${data.daily_records.map((r: any) => `
              <div class="record-card">
                <h3>${r.date}</h3>
                ${!r.has_records ? `<p style="color:#94a3b8; font-size: 13px;">No records</p>` : `
                  ${r.movement.length ? `<p><strong>Movement:</strong><br>${r.movement.map((m: any) => `${m.name} — ${m.duration} min`).join('<br>')}</p>` : ''}
                  ${r.nutrition.length ? `<p><strong>Meals:</strong><br>${r.nutrition.map((m: any) => `${m.meal_name} — ${m.calories} kcal, ${m.sodium_mg}mg sodium`).join('<br>')}</p>` : ''}
                  ${r.vitals.length ? `<p><strong>Vitals:</strong><br>${r.vitals.map((v: any) => `${v.systolic}/${v.diastolic} mmHg — ${v.bpm} BPM`).join('<br>')}</p>` : ''}
                  ${r.sleep.length ? `<p><strong>Sleep:</strong><br>${r.sleep.map((s: any) => `${s.hours} hours (Quality: ${s.quality})`).join('<br>')}</p>` : ''}
                  ${r.symptoms.length ? `<p><strong>Symptoms:</strong><br>${r.symptoms.map((s: any) => `${s.name} (Severity: ${s.severity}/10)`).join('<br>')}</p>` : ''}
                `}
              </div>
            `).join('')}

            <h2>VITAL TIMELINE</h2>
            ${data.vitals.records.length ? data.vitals.records.map((r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">${r.date} · ${r.time}</strong><br>
                Blood Pressure: <strong>${r.systolic} / ${r.diastolic} mmHg</strong><br>
                Heart Rate: <strong>${r.bpm} BPM</strong>
                ${r.weight_kg ? `<br>Weight: <strong>${r.weight_kg} kg</strong>` : ''}
              </div>
            `).join('') : '<p style="color:#94a3b8;">Not recorded</p>'}

            <h2>SLEEP TIMELINE</h2>
            ${data.sleep.records.length ? data.sleep.records.map((r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">${r.date}</strong><br>
                Duration: <strong>${r.hours}h</strong><br>
                Quality: <strong>${r.quality}</strong>
              </div>
            `).join('') : '<p style="color:#94a3b8;">No sleep records were logged during this period.</p>'}

            <h2>SYMPTOM TIMELINE</h2>
            ${data.symptoms.records.length ? data.symptoms.records.map((r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">${r.date} · ${r.time}</strong><br>
                <strong>${r.name}</strong><br>
                Severity: <strong>${r.severity}/10</strong><br>
                Context: <strong>${r.context || 'Not specified'}</strong>
              </div>
            `).join('') : '<p style="color:#94a3b8;">Not recorded</p>'}

            <h2>EXERCISE TIMELINE</h2>
            ${data.movement.records.length ? data.movement.records.map((r: any) => `
              <div style="margin-bottom: 16px; font-size: 13px;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">${r.date} · ${r.time}</strong><br>
                <strong>${r.name}</strong><br>
                Duration: ${r.duration} min<br>
                Type: ${r.type}<br>
                Intensity: ${r.intensity}<br>
                Goal: ${r.goal}<br>
                Status: ${r.status}<br>
                ${r.instructions.length ? `<div style="margin-top: 4px; color: #475569;"><em>How it was performed:</em><br> ${r.instructions.map((ins: string, i: number) => `${i+1}. ${ins}`).join('<br>')}</div>` : ''}
              </div>
            `).join('') : '<p style="color:#94a3b8;">Not recorded</p>'}

            <h2>MEAL TIMELINE</h2>
            ${data.nutrition.records.length ? data.nutrition.records.map((r: any) => `
              <div style="margin-bottom: 12px; font-size: 13px;">
                <strong style="color: #64748b; font-size: 12px; text-transform: uppercase;">${r.date} · ${r.time}</strong><br>
                <strong>${r.meal_name}</strong><br>
                ${r.calories} kcal<br>
                ${r.sodium_mg} mg sodium
              </div>
            `).join('') : '<p style="color:#94a3b8;">Not recorded</p>'}

            <h2>HSS / STABILITY</h2>
            <p>Weekly Average: <strong>${data.stability.average ?? 'Not recorded'}</strong></p>
            ${data.stability.records.length ? `
              <p>Daily Recorded Scores:</p>
              <ul>
                ${data.stability.records.map((r: any) => `<li>${r.date} — ${r.score}</li>`).join('')}
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
        contentContainerClassName="px-5 pb-8 pt-4 md:max-w-2xl lg:max-w-4xl mx-auto w-full"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeTint} />}
      >
        {/* HERO / WEEK HEADER */}
        <View className="mb-8 pt-2">
          <Text className="text-[12px] font-bold text-slate-400 dark:text-slate-500 tracking-[0.1em] uppercase mb-1">
            Your Week
          </Text>
          <Text className="text-[32px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
            {data.date_range.display}
          </Text>
          <Text className="text-[16px] text-slate-600 dark:text-slate-400 leading-relaxed max-w-[90%]">
            A chronological record of your health activity this week.
          </Text>
        </View>

        {/* GLANCE GRID */}
        <View className="mb-8">
          <SectionTitle title="Week At A Glance" />
          <View className="flex-row gap-3 mb-3">
            <MetricCard 
              title="Average recorded stability score" 
              value={data.overview.hss_average ? `${data.overview.hss_average} avg` : "No data"} 
              icon="❤️" color="#e11d48" 
            />
            <MetricCard 
              title="Movement" 
              value={`${data.overview.movement_minutes} min`} 
              icon="🏃" color="#2563eb" 
            />
          </View>
          <View className="flex-row gap-3">
            <MetricCard 
              title="Sleep" 
              value={data.overview.sleep_average_hours ? `${data.overview.sleep_average_hours} hr` : "No data"} 
              icon="😴" color="#7c3aed" 
            />
            <MetricCard 
              title="Vitals" 
              value={`${data.overview.vital_days} days`} 
              icon="🩺" color="#059669" 
            />
          </View>
        </View>

        {/* DAILY RECORD TIMELINE */}
        <View className="mb-8">
          <SectionTitle title="Daily Record" />
          {data.daily_records.map((dayData: any, idx: number) => (
            <DailyRecordRow key={idx} dayData={dayData} activeTint={activeTint} />
          ))}
        </View>

        {/* DOMAIN SECTIONS - DETAILED */}
        <View className="gap-y-8 mb-8">
          
          {/* VITALS */}
          <View>
            <SectionTitle title="Vital Readings" icon="heart" color="#e11d48" />
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              {data.vitals.records.length > 0 ? data.vitals.records.map((r: any, idx: number) => (
                <View key={idx} className="mb-4 last:mb-0">
                  <Text className="text-[11px] font-bold text-slate-400 uppercase mb-1">{r.date} · {r.time}</Text>
                  <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-0.5">Blood Pressure: {r.systolic} / {r.diastolic} mmHg</Text>
                  <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-0.5">Heart Rate: {r.bpm} BPM</Text>
                  {r.weight_kg ? <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-0.5">Weight: {r.weight_kg} kg</Text> : null}
                  {r.medication !== undefined && r.medication !== null ? <Text className="text-[14px] text-slate-500">Medication: {r.medication ? 'Taken' : 'Not taken'}</Text> : null}
                </View>
              )) : (
                <Text className="text-[15px] text-slate-400">Not recorded</Text>
              )}
            </View>
          </View>

          {/* SLEEP */}
          <View>
            <SectionTitle title="Sleep Record" icon="moon" color="#7c3aed" />
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              {data.sleep.records.length > 0 ? data.sleep.records.map((r: any, idx: number) => (
                <View key={idx} className="mb-4 last:mb-0">
                  <Text className="text-[11px] font-bold text-slate-400 uppercase mb-1">{r.date}</Text>
                  <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-0.5">Duration: {r.hours}h</Text>
                  <Text className="text-[15px] font-medium text-slate-900 dark:text-white">Quality: {r.quality}</Text>
                </View>
              )) : (
                <Text className="text-[15px] text-slate-400">Not recorded</Text>
              )}
            </View>
          </View>

          {/* SYMPTOMS */}
          <View>
            <SectionTitle title="Symptom Record" icon="alert-circle" color="#ea580c" />
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              {data.symptoms.records.length > 0 ? data.symptoms.records.map((r: any, idx: number) => (
                <View key={idx} className="mb-4 last:mb-0">
                  <Text className="text-[11px] font-bold text-slate-400 uppercase mb-1">{r.date} · {r.time}</Text>
                  <Text className="text-[15px] font-medium text-slate-900 dark:text-white mb-0.5">{r.name}</Text>
                  <Text className="text-[15px] text-slate-600 dark:text-slate-400">Severity: {r.severity}/10</Text>
                  {r.context ? <Text className="text-[15px] text-slate-600 dark:text-slate-400">Context: {r.context}</Text> : null}
                </View>
              )) : (
                <Text className="text-[15px] text-slate-400">Not recorded</Text>
              )}
            </View>
          </View>

          {/* EXERCISE */}
          <View>
            <SectionTitle title="Exercise Record" icon="activity" color="#2563eb" />
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              {data.movement.records.length > 0 ? data.movement.records.map((r: any, idx: number) => (
                <View key={idx} className="mb-5 last:mb-0">
                  <Text className="text-[11px] font-bold text-slate-400 uppercase mb-1">{r.date} · {r.time}</Text>
                  <Text className="text-[16px] font-bold text-slate-900 dark:text-white mb-2">{r.name}</Text>
                  <Text className="text-[14px] text-slate-600 dark:text-slate-400 mb-0.5">Duration: {r.duration} min</Text>
                  <Text className="text-[14px] text-slate-600 dark:text-slate-400 mb-0.5">Type: {r.type}</Text>
                  <Text className="text-[14px] text-slate-600 dark:text-slate-400 mb-0.5">Intensity: {r.intensity}</Text>
                  <Text className="text-[14px] text-slate-600 dark:text-slate-400 mb-0.5">Goal: {r.goal}</Text>
                  <Text className="text-[14px] text-slate-600 dark:text-slate-400 mb-2">Status: {r.status}</Text>
                  {r.instructions && r.instructions.length > 0 && (
                    <View className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 mt-1">
                      <Text className="text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wide">How it was performed</Text>
                      {r.instructions.map((ins: string, i: number) => (
                        <Text key={i} className="text-[13px] text-slate-600 dark:text-slate-300 mb-1">
                          {i + 1}. {ins}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )) : (
                <Text className="text-[15px] text-slate-400">Not recorded</Text>
              )}
            </View>
          </View>

          {/* MEALS */}
          <View>
            <SectionTitle title="Meal Record" icon="coffee" color="#d97706" />
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
              {data.nutrition.records.length > 0 ? data.nutrition.records.map((r: any, idx: number) => (
                <View key={idx} className="mb-4 last:mb-0">
                  <Text className="text-[11px] font-bold text-slate-400 uppercase mb-1">{r.date} · {r.time}</Text>
                  <Text className="text-[15px] font-semibold text-slate-900 dark:text-white mb-0.5">{r.meal_name}</Text>
                  <Text className="text-[14px] text-slate-600 dark:text-slate-400">{r.calories} kcal · {r.sodium_mg} mg sodium</Text>
                </View>
              )) : (
                <Text className="text-[15px] text-slate-400">Not recorded</Text>
              )}
            </View>
          </View>
        </View>

        {/* CONSISTENCY */}
        <View className="mb-8 bg-orange-50 dark:bg-orange-950/30 rounded-2xl p-5 border border-orange-100 dark:border-orange-900/30">
          <SectionTitle title="Your Recording Streak" color="#ea580c" />
          <Text className="text-[20px] font-bold text-slate-900 dark:text-white mb-1">
            🔥 {data.consistency.current_streak} days
          </Text>
          <Text className="text-[15px] text-slate-600 dark:text-slate-400">
            Keep building your health record.
          </Text>
        </View>

        {/* DOCTOR REPORT ACTION */}
        <View className="mb-8">
          <AnimatedButton
            onPress={exportReport}
            className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 flex-row items-center"
          >
            <View className="w-12 h-12 rounded-full items-center justify-center mr-4" style={{ backgroundColor: `${activeTint}15` }}>
              <Feather name="file-text" size={20} color={activeTint} />
            </View>
            <View className="flex-1">
              <Text className="text-[16px] font-bold text-slate-900 dark:text-white mb-0.5">
                Export 7-Day Health Report
              </Text>
              <Text className="text-[14px] text-slate-500">
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
