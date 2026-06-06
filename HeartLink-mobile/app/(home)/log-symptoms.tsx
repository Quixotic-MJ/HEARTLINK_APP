import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// ─── Types & Constants ────────────────────────────────────────────────────────

type SymptomType =
  | "None (Feeling fine)"
  | "Chest Discomfort / Tightness"
  | "Shortness of Breath"
  | "Dizziness / Lightheadedness"
  | "Palpitations"
  | "Fatigue / Weakness";

type ContextType =
  | "While resting"
  | "During physical activity"
  | "After eating";

const SYMPTOMS: SymptomType[] = [
  "None (Feeling fine)",
  "Chest Discomfort / Tightness",
  "Shortness of Breath",
  "Dizziness / Lightheadedness",
  "Palpitations",
  "Fatigue / Weakness",
];

const CONTEXTS: ContextType[] = [
  "While resting",
  "During physical activity",
  "After eating",
];

// Icon map for each symptom
const SYMPTOM_ICONS: Record<SymptomType, string> = {
  "None (Feeling fine)": "emoticon-happy-outline",
  "Chest Discomfort / Tightness": "heart-pulse",
  "Shortness of Breath": "lungs",
  "Dizziness / Lightheadedness": "head-dizzy",
  Palpitations: "waveform",
  "Fatigue / Weakness": "battery-low",
};

const CONTEXT_ICONS: Record<ContextType, string> = {
  "While resting": "sofa-outline",
  "During physical activity": "run",
  "After eating": "food-outline",
};

// ─── Severity colors (plain values — no dynamic className) ────────────────────

function getSeverityColor(num: number) {
  if (num <= 3) return { bg: "#eaf3de", border: "#c0dd97", text: "#3b6d11" };
  if (num <= 6) return { bg: "#faeeda", border: "#fac775", text: "#854f0b" };
  return { bg: "#fcebeb", border: "#f7c1c1", text: "#a32d2d" };
}

function getSeverityLabel(num: number) {
  if (num <= 3) return "Mild";
  if (num <= 6) return "Moderate";
  return "Severe";
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <View className="flex-row items-center gap-2 mb-3 mt-5">
      <MaterialCommunityIcons name={icon as any} size={16} color="#94a3b8" />
      <Text className="text-[13px] font-medium text-slate-500 uppercase tracking-wide">
        {title}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LogSymptomsScreen() {
  const router = useRouter();

  const [timestamp, setTimestamp] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<SymptomType[]>([
    "None (Feeling fine)",
  ]);
  const [severity, setSeverity] = useState<number>(1);
  const [context, setContext] = useState<ContextType>("While resting");

  useEffect(() => {
    setTimestamp(
      new Date().toLocaleDateString("en-PH", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, []);

  const hasRealSymptoms =
    !selectedSymptoms.includes("None (Feeling fine)") &&
    selectedSymptoms.length > 0;

  const toggleSymptom = (symp: SymptomType) => {
    if (symp === "None (Feeling fine)") {
      setSelectedSymptoms(["None (Feeling fine)"]);
      return;
    }
    let next = selectedSymptoms.filter((s) => s !== "None (Feeling fine)");
    if (next.includes(symp)) {
      next = next.filter((s) => s !== symp);
    } else {
      next.push(symp);
    }
    setSelectedSymptoms(next.length === 0 ? ["None (Feeling fine)"] : next);
  };

  const isEmergency =
    hasRealSymptoms &&
    ((selectedSymptoms.includes("Chest Discomfort / Tightness") &&
      severity >= 7) ||
      (selectedSymptoms.includes("Shortness of Breath") &&
        context === "While resting"));

  const handleLocateCardiologist = () => {
    Linking.openURL(
      "https://www.google.com/maps/search/Cardiologist+in+Cebu+City",
    ).catch(() => Alert.alert("Error", "Could not open map application."));
  };

  const handleSubmit = () => {
    if (isEmergency) {
      Alert.alert(
        "Critical log submitted",
        "Your clinical indicators reflect an elevated risk. Please seek medical attention immediately.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } else {
      Alert.alert(
        "Health log submitted",
        "Your symptom log has been saved to your weekly wrap-up.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    }
  };

  const sevColor = getSeverityColor(severity);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-3 border-b border-slate-200/50">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200/70 items-center justify-center mr-3"
        >
          <Feather name="arrow-left" size={18} color="#0f172a" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-[17px] font-medium text-slate-900">
            Log symptoms
          </Text>
          <Text className="text-[12px] text-slate-400 mt-0.5">{timestamp}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-28 pt-3"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Emergency Banner ── */}
        {isEmergency && (
          <View
            className="rounded-2xl p-4 mt-2 mb-1 border"
            style={{ backgroundColor: "#fcebeb", borderColor: "#f7c1c1" }}
          >
            <View className="flex-row items-center gap-2 mb-2">
              <Feather name="alert-triangle" size={16} color="#a32d2d" />
              <Text
                className="text-[13px] font-medium uppercase tracking-wide"
                style={{ color: "#a32d2d" }}
              >
                Elevated risk detected
              </Text>
            </View>
            <Text
              className="text-[13px] leading-relaxed mb-3"
              style={{ color: "#791f1f" }}
            >
              Your symptoms suggest an acute cardiovascular event. Please seek
              immediate medical evaluation.
            </Text>
            <TouchableOpacity
              onPress={handleLocateCardiologist}
              activeOpacity={0.8}
              className="bg-white rounded-xl py-2.5 flex-row items-center justify-center gap-2 border border-red-100"
            >
              <MaterialCommunityIcons
                name="map-marker-radius"
                size={16}
                color="#a32d2d"
              />
              <Text
                className="text-[13px] font-medium"
                style={{ color: "#a32d2d" }}
              >
                Find cardiologist in Cebu City
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Status overview card ── */}
        <View className="bg-white rounded-2xl border border-slate-200/70 p-4 mt-2">
          <Text className="text-[11px] text-slate-400 uppercase tracking-wide mb-3">
            Current log status
          </Text>
          <View className="flex-row gap-3">
            {/* Symptom count */}
            <View className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-200/70 items-center">
              <Text className="text-[22px] font-medium text-slate-900">
                {hasRealSymptoms ? selectedSymptoms.length : 0}
              </Text>
              <Text className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">
                Symptoms
              </Text>
            </View>
            {/* Severity */}
            <View
              className="flex-1 rounded-xl p-3 border items-center"
              style={{
                backgroundColor: hasRealSymptoms ? sevColor.bg : "#f8fafc",
                borderColor: hasRealSymptoms ? sevColor.border : "#e2e8f0",
              }}
            >
              <Text
                className="text-[22px] font-medium"
                style={{ color: hasRealSymptoms ? sevColor.text : "#cbd5e1" }}
              >
                {hasRealSymptoms ? severity : "—"}
              </Text>
              <Text
                className="text-[10px] mt-0.5 uppercase tracking-wide"
                style={{ color: hasRealSymptoms ? sevColor.text : "#cbd5e1" }}
              >
                {hasRealSymptoms ? getSeverityLabel(severity) : "Severity"}
              </Text>
            </View>
            {/* Context */}
            <View className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-200/70 items-center">
              <MaterialCommunityIcons
                name={CONTEXT_ICONS[context] as any}
                size={22}
                color="#64748b"
              />
              <Text
                className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide text-center"
                numberOfLines={2}
              >
                {context.replace("During ", "")}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Symptoms ── */}
        <SectionHeader
          title="What are you feeling?"
          icon="clipboard-list-outline"
        />
        <View className="gap-2">
          {SYMPTOMS.map((symp) => {
            const isSelected = selectedSymptoms.includes(symp);
            const isNone = symp === "None (Feeling fine)";

            // All dynamic colors via inline style — no dynamic className on TouchableOpacity
            const bg = isSelected ? (isNone ? "#eaf3de" : "#0f172a") : "#fff";
            const border = isSelected
              ? isNone
                ? "#c0dd97"
                : "#0f172a"
              : "#e2e8f0";
            const textColor = isSelected
              ? isNone
                ? "#3b6d11"
                : "#fff"
              : "#475569";
            const iconColor = isSelected
              ? isNone
                ? "#3b6d11"
                : "#fff"
              : "#94a3b8";

            return (
              <TouchableOpacity
                key={symp}
                activeOpacity={0.75}
                onPress={() => toggleSymptom(symp)}
                className="flex-row items-center px-4 py-3 rounded-xl border"
                style={{ backgroundColor: bg, borderColor: border }}
              >
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                  style={{
                    backgroundColor: isSelected
                      ? "rgba(255,255,255,0.12)"
                      : "#f8fafc",
                  }}
                >
                  <MaterialCommunityIcons
                    name={SYMPTOM_ICONS[symp] as any}
                    size={17}
                    color={iconColor}
                  />
                </View>
                <Text
                  className="flex-1 text-[14px] font-medium"
                  style={{ color: textColor }}
                >
                  {symp}
                </Text>
                {isSelected && (
                  <View
                    className="w-5 h-5 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: isNone
                        ? "#c0dd97"
                        : "rgba(255,255,255,0.2)",
                    }}
                  >
                    <Feather
                      name="check"
                      size={11}
                      color={isNone ? "#3b6d11" : "#fff"}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Severity Scale (conditional) ── */}
        {hasRealSymptoms && (
          <>
            <SectionHeader title="Severity scale" icon="speedometer" />
            <View className="bg-white rounded-2xl border border-slate-200/70 p-4">
              <View className="flex-row justify-between mb-3">
                <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
                  1 — Mild
                </Text>
                <Text className="text-[11px] text-slate-400 uppercase tracking-wide">
                  10 — Severe
                </Text>
              </View>

              {/* Number buttons */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isActive = severity === num;
                  const c = getSeverityColor(num);
                  return (
                    <TouchableOpacity
                      key={num}
                      onPress={() => setSeverity(num)}
                      className="w-11 h-11 rounded-xl items-center justify-center border"
                      style={{
                        backgroundColor: isActive ? c.bg : "#f8fafc",
                        borderColor: isActive ? c.border : "#e2e8f0",
                      }}
                    >
                      <Text
                        className="text-[16px] font-medium"
                        style={{ color: isActive ? c.text : "#94a3b8" }}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Selected level pill */}
              <View className="items-center mt-4">
                <View
                  className="flex-row items-center gap-2 px-4 py-2 rounded-xl border"
                  style={{
                    backgroundColor: sevColor.bg,
                    borderColor: sevColor.border,
                  }}
                >
                  <Text
                    className="text-[13px] font-medium"
                    style={{ color: sevColor.text }}
                  >
                    {getSeverityLabel(severity)} · {severity} / 10
                  </Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* ── Context ── */}
        <SectionHeader
          title="When did this happen?"
          icon="clock-time-four-outline"
        />
        <View className="gap-2">
          {CONTEXTS.map((ctx) => {
            const isSelected = context === ctx;
            return (
              <TouchableOpacity
                key={ctx}
                activeOpacity={0.75}
                onPress={() => setContext(ctx)}
                className="flex-row items-center px-4 py-3.5 rounded-xl border"
                style={{
                  backgroundColor: isSelected ? "#0f172a" : "#fff",
                  borderColor: isSelected ? "#0f172a" : "#e2e8f0",
                }}
              >
                <View
                  className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                  style={{
                    backgroundColor: isSelected
                      ? "rgba(255,255,255,0.1)"
                      : "#f8fafc",
                  }}
                >
                  <MaterialCommunityIcons
                    name={CONTEXT_ICONS[ctx] as any}
                    size={16}
                    color={isSelected ? "#fff" : "#94a3b8"}
                  />
                </View>
                <Text
                  className="flex-1 text-[14px] font-medium"
                  style={{ color: isSelected ? "#fff" : "#475569" }}
                >
                  {ctx}
                </Text>
                {/* Radio indicator */}
                <View
                  className="w-5 h-5 rounded-full border-2 items-center justify-center"
                  style={{
                    borderColor: isSelected
                      ? "rgba(255,255,255,0.4)"
                      : "#e2e8f0",
                  }}
                >
                  {isSelected && (
                    <View
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: "#fff" }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Submit ── */}
        <TouchableOpacity
          onPress={handleSubmit}
          activeOpacity={0.85}
          className="w-full rounded-2xl py-3.5 items-center justify-center flex-row gap-2 mt-7"
          // Dynamic bg via style — no dynamic className
          style={{ backgroundColor: isEmergency ? "#a32d2d" : "#0f172a" }}
        >
          <Feather
            name={isEmergency ? "alert-triangle" : "check"}
            size={16}
            color="#fff"
          />
          <Text className="text-white text-[14px] font-medium">
            {isEmergency ? "Submit critical log" : "Submit health log"}
          </Text>
        </TouchableOpacity>

        {isEmergency && (
          <Text className="text-[11px] text-slate-400 text-center mt-2 leading-relaxed">
            Your physician will be notified of this high-priority log.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
