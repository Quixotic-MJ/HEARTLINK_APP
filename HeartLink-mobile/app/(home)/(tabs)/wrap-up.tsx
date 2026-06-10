import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

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
      <View className="bg-white rounded-2xl border border-slate-200/70 p-3.5">
        {/* Icon bg color is dynamic — kept as inline style */}
        <View
          className="w-8 h-8 rounded-lg items-center justify-center mb-2.5"
          style={{ backgroundColor: iconBg }}
        >
          <MaterialCommunityIcons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text className="text-[22px] font-medium text-slate-900 leading-tight">
          {value}
          {unit && <Text className="text-[13px] font-normal text-slate-400"> {unit}</Text>}
        </Text>
        <Text className="text-[11px] text-slate-400 mt-1 uppercase tracking-wide">
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
    <View className="bg-white rounded-2xl border border-slate-200/70 p-3.5 mb-4">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-[14px] font-medium text-slate-900">CSS score · daily</Text>
        <Text className="text-[11px] text-slate-300">Mon – Sun</Text>
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
                  className="w-full rounded-t-sm"
                  style={{
                    height: barHeight,
                    backgroundColor: color,
                    opacity: 0.5 + heightFraction * 0.5,
                  }}
                />
              </View>
              <Text className="text-[10px] text-slate-300">{d.day}</Text>
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
        !isLast ? "border-b border-slate-100" : ""
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
          hasCount ? "bg-red-50" : "bg-slate-50"
        }`}
      >
        <Text
          className="text-[11px] font-medium"
          style={{ color: hasCount ? "#a32d2d" : "#888780" }}
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
  const [isPositive, setIsPositive] = useState(true);
  const d = isPositive ? POSITIVE_DATA : NEGATIVE_DATA;

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
              <strong>Date Range:</strong> May 28 &ndash; June 3
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
                <td class="highlight">${d.css} / 100</td>
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
        Alert.alert("Error", "Sharing is not available on this device.");
        return;
      }
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to generate report.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* ── Top bar ── */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-2">
        <View className="flex-row items-center gap-2.5">
          <View className="w-9 h-9 bg-[#1e4ed8] rounded-xl items-center justify-center">
            <MaterialCommunityIcons name="heart-pulse" size={18} color="white" />
          </View>
          <Text className="text-[16px] font-medium text-slate-900 tracking-tight">HeartLink</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity onPress={() => router.push("/(home)/notifications")} className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 items-center justify-center">
            <Feather name="bell" size={17} color="#64748b" />
            <View style={{ position: "absolute", top: 8, right: 8 }} className="w-1.5 h-1.5 bg-red-500 rounded-full" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(home)/settings")} className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/70 items-center justify-center">
            <Feather name="settings" size={17} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(home)/profile")} activeOpacity={0.8} className="ml-1">
            <View className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden">
              <Image source={{ uri: "https://scontent.fcgy2-2.fna.fbcdn.net/v/t39.30808-6/470238702_122163229004273349_6885730481985014209_n.jpg?_nc_cat=104&ccb=1-7&_nc_sid=a5f93a&_nc_eui2=AeFspkU-pAnduqXzsg0nCMQSc3h1gs4ySEZzeHWCzjJIRiS7qjQy166_bn5hNqi44fxFQkp5tRFulwgVSN60yG1o&_nc_ohc=JjKG5iySuBYQ7kNvwF3zmCi&_nc_oc=AdqJL2LZkjt9IqiM_KPQtb2ZUT6mEm5UdI2cgi-6Mu6INC3QVBLGz8-OKHIG4Fuyfuk&_nc_zt=23&_nc_ht=scontent.fcgy2-2.fna&_nc_gid=zjeomdkvajMCPjEc3tC8YQ&_nc_ss=7b2a8&oh=00_Af_FFO3skv0KzZZjqU44lc3j6qTtYj5r07rF5GLagi9HDg&oe=6A275350" }} className="w-full h-full" resizeMode="cover" />
            </View>
            <View style={{ position: "absolute", bottom: -1, right: -1 }} className="w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-50" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row items-center justify-between px-5 pt-3">
        <View>
          <Text className="text-[22px] font-medium text-slate-900 tracking-tight">
            Weekly wrap-up
          </Text>
          <Text className="text-[13px] text-slate-400 mt-0.5">May 28 – June 3</Text>
        </View>
        <View className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/70 items-center justify-center mt-2">
          <Feather name="bar-chart-2" size={20} color="#888780" />
        </View>
      </View>

      {/* Dev toggle */}
      <View className="px-5 py-3">
        <View className="flex-row bg-slate-100 rounded-lg p-0.5 border border-slate-200/70">
          <TouchableOpacity
            className="flex-1 py-1.5 rounded-md items-center"
            style={
              isPositive
                ? {
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "rgba(226, 232, 240, 0.7)",
                    shadowColor: "#0f172a",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }
                : undefined
            }
            onPress={() => setIsPositive(true)}
            activeOpacity={0.8}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: isPositive ? "#0f172a" : "#94a3b8" }}
            >
              Positive week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 py-1.5 rounded-md items-center"
            style={
              !isPositive
                ? {
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "rgba(226, 232, 240, 0.7)",
                    shadowColor: "#0f172a",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }
                : undefined
            }
            onPress={() => setIsPositive(false)}
            activeOpacity={0.8}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: !isPositive ? "#0f172a" : "#94a3b8" }}
            >
              Negative week
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-28"
        showsVerticalScrollIndicator={false}
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
            value={d.css}
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
        <Text className="text-[14px] font-medium text-slate-900 mb-2.5">
          Symptom frequency
        </Text>
        <View className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden mb-5">
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
          className="bg-slate-900 py-3.5 rounded-2xl flex-row items-center justify-center gap-2"
          onPress={exportPDF}
          activeOpacity={0.85}
        >
          <Feather name="file-text" size={17} color="#fff" />
          <Text className="text-white text-[14px] font-medium">
            Export report for physician
          </Text>
        </TouchableOpacity>
        <Text className="text-xs text-slate-400 text-center mt-2.5 mb-10 px-4 leading-[18px]">
          Creates a secure PDF with your weekly aggregates, baseline data, and symptom tally.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}