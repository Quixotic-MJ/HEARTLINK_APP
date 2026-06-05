import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

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
  const [isPositive, setIsPositive] = useState(true);
  const d = isPositive ? POSITIVE_DATA : NEGATIVE_DATA;

  const handleExport = () => {
    Alert.alert(
      "Exporting report",
      "Compiling weekly aggregates, baseline data, and symptom frequency into a PDF for your physician…",
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-start justify-between px-5 pt-4 pb-1">
        <View>
          <Text className="text-[22px] font-medium text-slate-900 tracking-tight">
            Weekly wrap-up
          </Text>
          <Text className="text-[13px] text-slate-400 mt-0.5">May 28 – June 3</Text>
        </View>
        <View className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/70 items-center justify-center">
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
          onPress={handleExport}
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