import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Header } from "../../../components/Header";
import { useUser } from "../../../contexts/UserContext";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useToast } from "../../../contexts/ToastContext";

const base_url = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ───────────────────────────────────────────────────────────────────

type DayBar = {
  day: string;
  value: number;
};

type Symptom = {
  name: string;
  count: number;
};

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  unit,
  icon,
  iconColor,
  iconBg,
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <View className="w-1/2 px-1.5 mb-2.5">
      <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-3.5">
        {/* Icon bg color is dynamic — kept as inline style */}
        <View
          className="w-8 h-8 rounded-lg items-center justify-center mb-2.5"
          style={{ backgroundColor: iconBg }}
        >
          <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text className="text-[22px] font-medium text-slate-900 dark:text-white leading-tight">
          {value}
          {unit && <Text className="text-[13px] font-medium text-slate-500"> {unit}</Text>}
        </Text>
        <Text className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wide font-bold">
          {title}
        </Text>
      </View>
    </View>
  );
}

// ─── Day Bar Chart ────────────────────────────────────────────────────────────

function DayBarChart({ days, color }: { days: DayBar[]; color: string }) {
  const max = Math.max(...days.map((d) => d.value));
  return (
    <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 p-3.5 mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[14px] font-medium text-slate-900 dark:text-white">CSS score · daily</Text>
        <Text className="text-[11px] font-medium text-slate-400">Mon – Sun</Text>
      </View>
      <View className="flex-row items-end h-[68px] gap-1">
        {days.map((d, index) => {
          const heightFraction = d.value / max;
          const barHeight = Math.round(heightFraction * 52);
          return (
            <View key={`${d.day}-${index}`} className="flex-1 items-center gap-1">
              <View className="flex-1 w-full justify-end">
                {/* Bar height & color are dynamic — kept as inline style */}
                <View
                  className="w-full rounded-t-md"
                  style={{
                    height: barHeight,
                    backgroundColor: color,
                    opacity: 0.5 + heightFraction * 0.5,
                  }}
                />
              </View>
              <Text className="text-[10px] font-bold text-slate-500">{d.day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Symptom Row ──────────────────────────────────────────────────────────────

function SymptomRow({ symptom, isLast }: { symptom: Symptom; isLast: boolean }) {
  const hasCount = symptom.count > 0;
  return (
    <View
      className={`flex-row items-center justify-between px-3.5 py-3 ${
        !isLast ? "border-b border-slate-100 dark:border-slate-800" : ""
      }`}
    >
      <View className="flex-row items-center gap-2.5">
        {/* Pip color is dynamic — kept as inline style */}
        <View
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: hasCount ? "#e24b4a" : "#639922" }}
        />
        <Text className="text-[13px] text-slate-600">{symptom.name}</Text>
      </View>
      <View
        className={`px-2.5 py-0.5 rounded-full ${
          hasCount ? "bg-red-50" : "bg-slate-50 dark:bg-slate-950"
        }`}
      >
        <Text
          className={`text-[11px] font-bold ${hasCount ? "text-red-700" : "text-slate-500 dark:text-slate-400"}`}
        >
          {symptom.count} {symptom.count === 1 ? "instance" : "instances"}
        </Text>
      </View>
    </View>
  );
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const POSITIVE_DATA = {
  css: 88,
  sodium: "9.9",
  active: 120,
  missed: 0,
  satFat: "18.5",
  fiber: "25",
  bannerTitle: "Weekly success",
  bannerText:
    "Your stability score remained high this week. Averaging under 1,500 mg of sodium daily successfully prevented any precautionary alerts.",
  symptoms: [
    { name: "Chest discomfort", count: 0 },
    { name: "Shortness of breath", count: 0 },
    { name: "Dizziness", count: 0 },
  ],
  days: [
    { day: "M", value: 92 },
    { day: "T", value: 88 },
    { day: "W", value: 94 },
    { day: "T", value: 85 },
    { day: "F", value: 90 },
    { day: "S", value: 87 },
    { day: "S", value: 80 },
  ],
  barColor: "#639922",
};

const NEGATIVE_DATA = {
  css: 65,
  sodium: "16.4",
  active: 15,
  missed: 3,
  satFat: "24.2",
  fiber: "14",
  bannerTitle: "Action needed",
  bannerText:
    "Shortness of breath occurred twice on days where dietary logging was skipped. Try logging meals consistently next week to maintain accurate tracking.",
  symptoms: [
    { name: "Shortness of breath", count: 2 },
    { name: "Chest discomfort", count: 1 },
    { name: "Dizziness", count: 0 },
  ],
  days: [
    { day: "M", value: 72 },
    { day: "T", value: 58 },
    { day: "W", value: 60 },
    { day: "T", value: 70 },
    { day: "F", value: 55 },
    { day: "S", value: 68 },
    { day: "S", value: 52 },
  ],
  barColor: "#e24b4a",
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WrapUpScreen() {
  const router = useRouter();
  const { userId, user } = useUser();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cssScore, setCssScore] = useState<number>(0);
  const [dynamicInsight, setDynamicInsight] = useState<{ title: string; text: string } | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!userId) return;
    if (!silent) setIsLoading(true);
    
    try {
      const response = await fetch(`${base_url}/api/dashboard/me`, {
        headers: {
          "Authorization": `Bearer ${userId}`
        }
      });
      if (response.ok) {
        const dash = await response.json();
        if (dash.css_score !== undefined) {
          setCssScore(dash.css_score);
        }
        if (dash.insight) {
          setDynamicInsight({
            title: dash.insight.title || "Weekly Insight",
            text: dash.insight.body || dash.insight.text,
          });
        }
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

  // Determine positive/negative week based on fetched CSS score
  const isPositive = cssScore >= 60 || cssScore === 0; // fallback to positive if 0
  const d = { ...(isPositive ? POSITIVE_DATA : NEGATIVE_DATA) };

  // Override with dynamic API insight if available
  if (dynamicInsight) {
    d.bannerTitle = dynamicInsight.title;
    d.bannerText = dynamicInsight.text;
  }

  // Use the fetched score in the display if available, else fallback
  const displayCss = cssScore > 0 ? cssScore : d.css;

  const exportPDF = async () => {
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #0f172a; line-height: 1.5; }
              h1 { font-size: 28px; font-weight: bold; margin-bottom: 8px; color: #0f172a; }
              p { margin: 0 0 30px 0; color: #64748b; font-size: 16px; }
              .details { margin-bottom: 30px; font-size: 16px; background-color: #f8fafc; padding: 20px; border-radius: 12px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 40px; }
              th, td { text-align: left; padding: 14px 16px; border-bottom: 1px solid #e2e8f0; }
              th { background-color: #f1f5f9; font-weight: bold; color: #475569; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
              td { font-size: 15px; color: #334155; }
              .highlight { font-weight: bold; color: #0f172a; }
              .alert-box { background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 16px; border-radius: 10px; margin-bottom: 30px; }
              .alert-title { font-weight: bold; font-size: 16px; margin-bottom: 6px; display: block; }
              h2 { font-size: 20px; color: #0f172a; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
            </style>
          </head>
          <body>
            <h1>Weekly Cardiovascular Wrap-up</h1>
            <p>Generated by HeartLink</p>
            
            <div class="details">
              <strong>Patient:</strong> Jane Doe<br><br>
              <strong>Date Range:</strong> {dateRangeStr}
            </div>
            
            <div class="alert-box">
              <span class="alert-title">System Alerts & Correlations</span>
              Warning: Shortness of breath reported twice on days with high sodium intake (>2,500mg).
            </div>
            
            <h2>Metrics Summary (with Trends)</h2>
            <table>
              <tr>
                <th>Metric</th>
                <th>Recorded Value</th>
                <th>Trend</th>
              </tr>
              <tr>
                <td>Average CSS Score</td>
                <td class="highlight">${displayCss} / 100</td>
                <td style="color: #639922;">+5 pts from last week</td>
              </tr>
              <tr>
                <td>Total Sodium Consumed</td>
                <td class="highlight">${d.sodium} g</td>
                <td style="color: #e24b4a;">+2.1 g from last week</td>
              </tr>
              <tr>
                <td>Total Active Minutes</td>
                <td class="highlight">${d.active} min</td>
                <td style="color: #639922;">+30 min from last week</td>
              </tr>
              <tr>
                <td>Total Saturated Fat</td>
                <td class="highlight">${d.satFat} g</td>
                <td style="color: #e24b4a;">+4.5 g from last week</td>
              </tr>
              <tr>
                <td>Average Fiber Intake</td>
                <td class="highlight">${d.fiber} g</td>
                <td style="color: #639922;">+2 g from last week</td>
              </tr>
              <tr>
                <td>Logs Missed</td>
                <td class="highlight">${d.missed}</td>
                <td style="color: #64748b;">No change</td>
              </tr>
            </table>

            <h2>Reported Symptoms</h2>
            <table>
              <tr>
                <th>Symptom</th>
                <th>Frequency</th>
              </tr>
              <tr>
                <td>Chest Discomfort</td>
                <td class="highlight">1 instance</td>
              </tr>
              <tr>
                <td>Shortness of Breath</td>
                <td class="highlight">2 instances</td>
              </tr>
              <tr>
                <td>Dizziness</td>
                <td class="highlight">0 instances</td>
              </tr>
            </table>

            <h2>Daily CSS Breakdown</h2>
            <table>
              <tr>
                <th>Day</th>
                <th>CSS Score</th>
              </tr>
              <tr>
                <td>Monday</td>
                <td class="highlight">72 / 100</td>
              </tr>
              <tr>
                <td>Tuesday</td>
                <td class="highlight">58 / 100</td>
              </tr>
              <tr>
                <td>Wednesday</td>
                <td class="highlight">60 / 100</td>
              </tr>
              <tr>
                <td>Thursday</td>
                <td class="highlight">70 / 100</td>
              </tr>
              <tr>
                <td>Friday</td>
                <td class="highlight">55 / 100</td>
              </tr>
              <tr>
                <td>Saturday</td>
                <td class="highlight">68 / 100</td>
              </tr>
              <tr>
                <td>Sunday</td>
                <td class="highlight">52 / 100</td>
              </tr>
            </table>

          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync())) {
        showToast({ title: "Error", message: "Sharing is not available on this device.", type: "error" });
        return;
      }
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error(error);
      showToast({ title: "Error", message: "Failed to generate report.", type: "error" });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Top bar ── */}
      <Header />

      <View className="flex-row items-center justify-between px-5 pt-3">
        <View>
          <Text className="text-[22px] font-medium text-slate-900 dark:text-white tracking-tight">
            Weekly wrap-up
          </Text>
          <Text className="text-[13px] text-slate-400 mt-0.5">May 28 – June 3</Text>
        </View>
        <View className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800/70 items-center justify-center mt-2">
          <Feather name="bar-chart-2" size={20} color="#888780" />
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-28 pt-2 md:max-w-2xl lg:max-w-4xl mx-auto w-full"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#64748b" />
        }
      >
        {/* Banner */}
        <View
          className={`rounded-2xl p-4 mb-4 border ${
            isPositive
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <View className="flex-row items-center gap-2 mb-2">
            {/* Dot color is dynamic — kept as inline style */}
            <View
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: isPositive ? "#639922" : "#e24b4a" }}
            />
            <Text
              className={`text-xs font-medium tracking-wide ${
                isPositive ? "text-green-800" : "text-red-800"
              }`}
            >
              {d.bannerTitle}
            </Text>
          </View>
          <Text
            className={`text-[13px] leading-5 ${
              isPositive ? "text-green-900" : "text-red-900"
            }`}
          >
            {d.bannerText}
          </Text>
        </View>

        {/* Metrics grid */}
        <View className="flex-row flex-wrap -mx-1.5 mb-2">
          <MetricCard
            title="Avg CSS score"
            value={displayCss}
            unit="/100"
            icon="heart-pulse"
            iconColor="#3b6d11"
            iconBg="#eaf3de"
          />
          <MetricCard
            title="Total sodium"
            value={d.sodium}
            unit="g"
            icon="shaker-outline"
            iconColor="#185fa5"
            iconBg="#e6f1fb"
          />
          <MetricCard
            title="Active minutes"
            value={d.active}
            unit="min"
            icon="run"
            iconColor="#3b6d11"
            iconBg="#eaf3de"
          />
          <MetricCard
            title="Logs missed"
            value={d.missed}
            icon="calendar-remove"
            iconColor="#854f0b"
            iconBg="#faeeda"
          />
          <MetricCard
            title="Total sat. fat"
            value={d.satFat}
            unit="g"
            icon="water-outline"
            iconColor="#185fa5"
            iconBg="#e6f1fb"
          />
          <MetricCard
            title="Avg fiber"
            value={d.fiber}
            unit="g"
            icon="leaf"
            iconColor="#3b6d11"
            iconBg="#eaf3de"
          />
        </View>

        {/* Day bar chart */}
        <DayBarChart days={d.days} color={d.barColor} />

        {/* Symptom frequency */}
        <Text className="text-[14px] font-medium text-slate-900 dark:text-white mb-2.5">
          Symptom frequency
        </Text>
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 overflow-hidden mb-5">
          {d.symptoms.map((s, i) => (
            <SymptomRow
              key={s.name}
              symptom={s}
              isLast={i === d.symptoms.length - 1}
            />
          ))}
        </View>

        {/* Export */}
        <TouchableOpacity
          className="bg-primary py-3.5 rounded-2xl flex-row items-center justify-center gap-2"
          onPress={exportPDF}
          activeOpacity={0.85}
        >
          <Feather name="file-text" size={17} className="text-primary-foreground" />
          <Text className="text-primary-foreground text-[15px] font-semibold">
            Export report for physician
          </Text>
        </TouchableOpacity>
        <Text className="text-[13px] text-slate-500 font-medium text-center mt-2.5 mb-10 px-4 leading-[18px]">
          Creates a secure PDF with your weekly aggregates, baseline data, and symptom tally.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
function ActivityLogAccordion({ activityLog }: { activityLog: any[] }) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  if (!activityLog || activityLog.length === 0) {
    return (
      <View className='mb-5'>
        <Text className='text-[14px] font-medium text-slate-900 dark:text-white mb-2.5'>
          Activity Log (Last 7 Days)
        </Text>
        <EmptyState
          icon={<Feather name="calendar" size={26} color="#94a3b8" />}
          title="No activity yet"
          subtitle="Your meal and exercise logs will appear here."
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 py-6"
        />
      </View>
    );
  }

  return (
    <View className='mb-5'>
      <Text className='text-[14px] font-medium text-slate-900 dark:text-white mb-2.5'>
        Activity Log (Last 7 Days)
      </Text>
      <View className='bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800/70 overflow-hidden'>
        {activityLog.map((log, index) => {
          const isExpanded = expandedDate === log.date;
          return (
            <View key={log.date} className={index !== activityLog.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setExpandedDate(isExpanded ? null : log.date)}
                className='flex-row items-center justify-between px-4 py-3.5'
              >
                <Text className='text-[14px] font-medium text-slate-800 dark:text-slate-200'>
                  {new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <View className='flex-row items-center gap-2'>
                  <View className='flex-row gap-1'>
                    {log.meals.length > 0 && <View className='w-1.5 h-1.5 rounded-full bg-blue-500' />}
                    {log.exercises.length > 0 && <View className='w-1.5 h-1.5 rounded-full bg-green-500' />}
                  </View>
                  <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color='#64748b' />
                </View>
              </TouchableOpacity>
              
              {isExpanded && (
                <View className='px-4 pb-4 pt-1'>
                  {log.meals.length > 0 && (
                    <View className='mb-2'>
                      <Text className='text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1'>Meals</Text>
                      {log.meals.map((m: string, i: number) => (
                        <Text key={'m'+i} className='text-[13px] text-slate-600 dark:text-slate-400 py-0.5'>� {m}</Text>
                      ))}
                    </View>
                  )}
                  {log.exercises.length > 0 && (
                    <View>
                      <Text className='text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1'>Exercises</Text>
                      {log.exercises.map((e: string, i: number) => (
                        <Text key={'e'+i} className='text-[13px] text-slate-600 dark:text-slate-400 py-0.5'>� {e}</Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

