import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, Linking, Platform, KeyboardAvoidingView, Modal } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../../../contexts/UserContext";
import { useToast } from "../../../contexts/ToastContext";
import { OfflineSyncService } from "../../../utils/OfflineSyncService";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import DsButton from "../../../components/onboarding/DsButton";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { useDs } from "../../../components/onboarding/useDs";
import { ds, DsColors } from "../../../constants/theme";
import { postLogAck } from "../../../services/companionCopy";
import {
  CHEST,
  completeReading,
  isHypertensiveCrisis as crisisFor,
  isSevereHypotension as lowFor,
  isSymptomEmergency,
} from "../../../services/vitalsCheck";
import { API_BASE_URL, apiFetch } from "../../../lib/api";

// The daily check-in: blood pressure (and pulse), medicines, how the patient feels, and weight if they like.
// Safety: a complete blood pressure reading of 180/120 or more, or under 90/60, chest discomfort rated 7 or
// more, or shortness of breath while resting opens the emergency guidance (services/vitalsCheck.ts).

const FINE = "None (Feeling fine)";
// Stored names (the backend and the score use them) and the words shown.
const SYMPTOMS: { id: string; label: string }[] = [
  { id: FINE, label: "I feel fine" },
  { id: CHEST, label: "Chest discomfort" },
  { id: "Shortness of Breath", label: "Short of breath" },
  { id: "Dizziness / Lightheadedness", label: "Dizzy" },
  { id: "Palpitations", label: "Heart racing" },
  { id: "Fatigue / Weakness", label: "Tired or weak" },
];
const CONTEXTS: { id: string; label: string; stored: string }[] = [
  { id: "While resting", label: "While resting", stored: "resting" },
  { id: "During physical activity", label: "During activity", stored: "after_exercise" },
  { id: "After eating", label: "After eating", stored: "after_eating" },
];

type Medicine = "taken" | "not_yet" | "none";
const MEDICINES: { id: Medicine; label: string }[] = [
  { id: "taken", label: "I took them" },
  { id: "not_yet", label: "Not yet" },
  { id: "none", label: "I don't take any" },
];

function strengthTag(n: number, c: DsColors) {
  if (n <= 3) return { text: "Mild", bg: c.mint, fg: c.charcoal };
  if (n <= 6) return { text: "Moderate", bg: c.peach, fg: c.warmText };
  return { text: "Severe", bg: c.rose, fg: c.ink };
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function LogSymptomsScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ triggered_by_exercise_id?: string }>();
  const fromExercise = !!params.triggered_by_exercise_id;
  const { userId, token } = useUser();
  const { showToast } = useToast();

  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [weight, setWeight] = useState("");
  const [showWeight, setShowWeight] = useState(false);
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([FINE]);
  const [strength, setStrength] = useState<Record<string, number>>({});
  // Nothing is chosen for the patient, except after an exercise, where we know it was during activity.
  const [context, setContext] = useState<string | null>(fromExercise ? "During physical activity" : null);

  const [lastReading, setLastReading] = useState<{ text: string; weight?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [hasInterrupted, setHasInterrupted] = useState(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

  const diastolicRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [symptomsY, setSymptomsY] = useState(0);
  const noMedsKey = userId ? `@no_regular_meds_${userId}` : null;

  // ── Safety checks (complete readings only) ──
  const reading = completeReading(systolic, diastolic);
  const isHypertensiveCrisis = crisisFor(reading);
  const isSevereHypotension = lowFor(reading);
  const hasRealSymptoms = !symptoms.includes(FINE) && symptoms.length > 0;
  const symptomEmergency = hasRealSymptoms && isSymptomEmergency(symptoms, strength, context);
  const isEmergency = isHypertensiveCrisis || isSevereHypotension || symptomEmergency;

  useEffect(() => {
    if (isEmergency && !hasInterrupted) {
      setShowEmergency(true);
      setHasInterrupted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [isEmergency, hasInterrupted]);

  // Today's reading fills in again if the patient comes back; otherwise the last one is shown for comparison.
  useEffect(() => {
    if (!userId || !token) return;
    let alive = true;
    (async () => {
      try {
        const res = await apiFetch(`/api/health-logs/${userId}?page=1&page_size=1`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok || !alive) return;
        const body = await res.json();
        const last = (body.data ?? body)?.[0];
        if (!last) return;
        const at = new Date(last.logged_at);
        if (sameDay(at, new Date())) {
          if (last.systolic_bp) setSystolic(String(last.systolic_bp));
          if (last.diastolic_bp) setDiastolic(String(last.diastolic_bp));
          if (last.heart_rate_bpm) setPulse(String(last.heart_rate_bpm));
          if (last.medication_taken === true) setMedicine("taken");
        }
        if (last.systolic_bp && last.diastolic_bp) {
          const when = sameDay(at, new Date()) ? "earlier today" : at.toLocaleDateString("en-US", { weekday: "long" });
          setLastReading({ text: `Last time ${last.systolic_bp}/${last.diastolic_bp}, ${when}`, weight: last.weight_kg ? String(last.weight_kg) : undefined });
        } else if (last.weight_kg) {
          setLastReading({ text: "", weight: String(last.weight_kg) });
        }
      } catch {
        // The form works without it.
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, token]);

  // Someone who said they take no regular medicines isn't asked again each day.
  useEffect(() => {
    if (!noMedsKey) return;
    AsyncStorage.getItem(noMedsKey)
      .then((v) => {
        if (v === "true") setMedicine((m) => m ?? "none");
      })
      .catch(() => {});
  }, [noMedsKey]);

  useEffect(() => {
    if (fromExercise && symptomsY > 0) {
      const t = setTimeout(() => scrollRef.current?.scrollTo({ y: symptomsY, animated: true }), 300);
      return () => clearTimeout(t);
    }
  }, [fromExercise, symptomsY]);

  const toggleSymptom = (id: string) => {
    Haptics.selectionAsync();
    if (id === FINE) {
      setSymptoms([FINE]);
      return;
    }
    const rest = symptoms.filter((s) => s !== FINE);
    const next = rest.includes(id) ? rest.filter((s) => s !== id) : [...rest, id];
    setSymptoms(next.length ? next : [FINE]);
  };

  const pickMedicine = (m: Medicine) => {
    Haptics.selectionAsync();
    setMedicine(m);
    if (noMedsKey) AsyncStorage.setItem(noMedsKey, m === "none" ? "true" : "false").catch(() => {});
  };

  const unrated = hasRealSymptoms ? symptoms.filter((s) => !strength[s]) : [];
  const needsWhen = hasRealSymptoms && !context;
  const blockedReason =
    unrated.length > 0
      ? "Rate how strong each symptom is to save"
      : needsWhen
        ? "Choose when it happened to save"
        : null;

  const findClinic = () => router.push("/locator" as never);
  const call911 = () => Linking.openURL("tel:911").catch(() => {});

  const handleSubmit = async (bypassIncompleteCheck = false) => {
    if (blockedReason) return;
    const toInt = (v: string): number | null => {
      const t = v.trim();
      if (!t) return null;
      const n = Number(t);
      return Number.isInteger(n) ? n : NaN;
    };
    const sys = toInt(systolic);
    const dia = toInt(diastolic);
    const hr = toInt(pulse);
    const w = weight.trim() ? Number(weight.trim()) : null;

    if (sys !== null && (isNaN(sys) || sys < 50 || sys > 300)) {
      showToast({ title: "Check the top number", message: "It's usually between 50 and 300 mmHg. Please check your reading.", type: "error" });
      return;
    }
    if (dia !== null && (isNaN(dia) || dia < 30 || dia > 200)) {
      showToast({ title: "Check the bottom number", message: "It's usually between 30 and 200 mmHg. Please check your reading.", type: "error" });
      return;
    }
    if (hr !== null && (isNaN(hr) || hr < 30 || hr > 250)) {
      showToast({ title: "Check your pulse", message: "It's usually between 30 and 250 bpm. Please check your reading.", type: "error" });
      return;
    }
    if (w !== null && (isNaN(w) || w < 20 || w > 400)) {
      showToast({ title: "Check your weight", message: "Please enter a weight between 20 and 400 kg.", type: "error" });
      return;
    }
    if ((sys === null) !== (dia === null)) {
      showToast({ title: "Both numbers needed", message: "Enter the top and the bottom number of your blood pressure.", type: "error" });
      return;
    }
    if (sys !== null && dia !== null) {
      if (sys <= dia) {
        showToast({ title: "Check your numbers", message: "The top number should be higher than the bottom number.", type: "error" });
        return;
      }
      if (sys - dia < 15) {
        showToast({ title: "Numbers very close", message: "The two numbers are unusually close. Please check how the cuff is placed and measure again.", type: "error" });
        return;
      }
    }

    const hasAnything = (sys !== null && dia !== null) || hr !== null || w !== null || hasRealSymptoms || medicine !== null;
    if (!hasAnything) {
      showToast({ title: "Nothing to save yet", message: "Add your blood pressure, your medicines or how you feel.", type: "info" });
      return;
    }

    // Soft warning for a check-in without blood pressure or the medicine answer (it can still be saved).
    if (!bypassIncompleteCheck && (sys === null || medicine === null)) {
      setShowIncompleteWarning(true);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);

    const payload = {
      systolic_bp: sys,
      diastolic_bp: dia,
      heart_rate_bpm: hr,
      weight_kg: w,
      // The table has no "doesn't take any"; that answer is kept on the phone and saved as not taken.
      medication_taken: medicine === "taken",
      symptoms,
      severity_map: hasRealSymptoms ? Object.fromEntries(symptoms.map((s) => [s, strength[s]])) : {},
      context: hasRealSymptoms || fromExercise ? CONTEXTS.find((x) => x.id === context)?.stored ?? null : null,
      triggered_by_exercise_id: params.triggered_by_exercise_id || null,
      notes: "",
    };

    let saved = false;
    try {
      const res = await apiFetch(`/api/health-logs/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) {
          showToast({ title: "Couldn't save", message: "Please check your numbers and try again.", type: "error", duration: 6000 });
          setIsSubmitting(false);
          return;
        }
        throw new Error(`Server returned ${res.status}`);
      }
      saved = true;
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
      queryClient.invalidateQueries({ queryKey: ["trends", userId] });
    } catch {
      await OfflineSyncService.queueRequest(`${API_BASE_URL}/api/health-logs/${userId}`, "POST", payload, undefined, userId || undefined);
      saved = true;
    } finally {
      setIsSubmitting(false);
    }
    if (!saved) return;

    if (isEmergency) {
      if (isSevereHypotension) {
        showToast({ title: "Very low blood pressure", message: "Your reading is under 90/60 mmHg. Sit or lie down, drink some water, and get medical help if you feel faint.", type: "error", duration: 8000 });
      } else if (isHypertensiveCrisis) {
        showToast({ title: "Very high blood pressure", message: "Your reading is 180/120 mmHg or higher. Please get emergency medical care.", type: "error", duration: 8000 });
      } else {
        showToast({ title: "Please get checked now", message: "What you logged can be a sign of a heart problem. Emergency medical care is recommended.", type: "error", duration: 6000 });
      }
      if (hasInterrupted) router.back();
      else {
        setShowEmergency(true);
        setHasInterrupted(true);
      }
      return;
    }

    if (sys !== null && dia !== null) {
      showToast({ ...postLogAck("vitals", `${sys}/${dia} mmHg${hr ? `, ${hr} bpm` : ""}`), type: "success" });
    } else {
      showToast({ title: "Check-in saved", message: "Your check-in for today is saved.", type: "success" });
    }
    router.back();
  };

  const bigInput = (danger: boolean) => ({
    height: 72,
    borderWidth: danger ? 1.5 : 1,
    borderColor: danger ? c.danger : c.hairlineStrong,
    borderRadius: 12,
    fontSize: 34,
    fontWeight: "600" as const,
    color: c.ink,
    textAlign: "center" as const,
    backgroundColor: c.canvas,
  });
  const radioRow = (on: boolean) => ({
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: on ? 2 : 1,
    borderColor: on ? c.line : c.hairline,
    backgroundColor: on ? c.tint : c.canvas,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  });
  const radioDot = (on: boolean) => (
    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: on ? 6 : 2, borderColor: on ? c.line : c.hairlineStrong, backgroundColor: c.canvas }} />
  );
  const bpDanger = isHypertensiveCrisis || isSevereHypotension;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.canvas }} edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text style={{ fontSize: 14, color: c.slate }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 28 }}
        >
          <View style={{ gap: 6 }}>
            <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "600", color: c.ink }}>
              {"Today's check-in"}
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>Your blood pressure, medicines and how you feel. Takes about a minute.</Text>
          </View>

          {/* ── Blood pressure ── */}
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: c.ink }}>
                Blood pressure
              </Text>
              {lastReading?.text ? <Text style={{ fontSize: 13, color: c.slate, flexShrink: 1, textAlign: "right" }}>{lastReading.text}</Text> : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 13, color: c.slate }}>Top number</Text>
                <TextInput
                  value={systolic}
                  onChangeText={(v) => {
                    const clean = v.replace(/[^0-9]/g, "");
                    setSystolic(clean);
                    if (clean.length === 3) diastolicRef.current?.focus();
                  }}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="120"
                  placeholderTextColor={c.muted}
                  returnKeyType="next"
                  onSubmitEditing={() => diastolicRef.current?.focus()}
                  accessibilityLabel="Top number, systolic, in mmHg"
                  style={bigInput(bpDanger)}
                />
              </View>
              <Text style={{ fontSize: 34, color: c.muted, paddingBottom: 14 }} accessibilityElementsHidden importantForAccessibility="no">
                /
              </Text>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 13, color: c.slate }}>Bottom number</Text>
                <TextInput
                  ref={diastolicRef}
                  value={diastolic}
                  onChangeText={(v) => setDiastolic(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="80"
                  placeholderTextColor={c.muted}
                  accessibilityLabel="Bottom number, diastolic, in mmHg"
                  style={bigInput(bpDanger)}
                />
              </View>
              <Text style={{ fontSize: 13, color: c.slate, paddingBottom: 26 }}>mmHg</Text>
            </View>

            {bpDanger && reading ? (
              <EmergencyCard
                c={c}
                title={isHypertensiveCrisis ? "This reading is very high" : "This reading is very low"}
                body={
                  isHypertensiveCrisis
                    ? `${reading.sys}/${reading.dia} is at or above 180/120. Rest for 5 minutes and measure again. If it stays this high or you feel worse, call 911 now.`
                    : `${reading.sys}/${reading.dia} is under 90/60. Sit or lie down and drink some water. Get medical help if you feel faint or unwell.`
                }
                onCall={call911}
                onClinic={findClinic}
              />
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: c.hairlineStrong, borderRadius: 10 }}>
              <Text style={{ fontSize: 15, color: c.charcoal }}>
                Pulse <Text style={{ color: c.steel }}>(optional)</Text>
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <TextInput
                  value={pulse}
                  onChangeText={(v) => setPulse(v.replace(/[^0-9]/g, ""))}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="72"
                  placeholderTextColor={c.muted}
                  accessibilityLabel="Pulse in beats per minute"
                  style={{ minWidth: 56, height: 44, fontSize: 17, fontWeight: "600", color: c.ink, textAlign: "right" }}
                />
                <Text style={{ fontSize: 13, color: c.slate }}>bpm</Text>
              </View>
            </View>
          </View>

          {/* ── Medicines ── */}
          <View style={{ gap: 12 }}>
            <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: c.ink }}>
              Medicines today
            </Text>
            <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
              {MEDICINES.map((m) => {
                const on = medicine === m.id;
                return (
                  <AnimatedButton
                    key={m.id}
                    onPress={() => pickMedicine(m.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={m.label}
                    style={radioRow(on)}
                  >
                    <Text style={{ fontSize: 16, color: on ? c.onTint : c.ink }}>{m.label}</Text>
                    {radioDot(on)}
                  </AnimatedButton>
                );
              })}
            </View>
          </View>

          {/* ── How do you feel ── */}
          <View style={{ gap: 12 }} onLayout={(e) => setSymptomsY(e.nativeEvent.layout.y)}>
            <Text accessibilityRole="header" style={{ fontSize: 18, fontWeight: "600", color: c.ink }}>
              How do you feel?
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {SYMPTOMS.map((s) => {
                const on = symptoms.includes(s.id);
                return (
                  <AnimatedButton
                    key={s.id}
                    onPress={() => toggleSymptom(s.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={s.label}
                    style={{ height: 44, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, justifyContent: "center", borderColor: on ? c.ink : c.hairline, backgroundColor: on ? c.ink : c.canvas }}
                  >
                    <Text style={{ fontSize: 15, color: on ? c.canvas : c.charcoal }}>{s.label}</Text>
                  </AnimatedButton>
                );
              })}
            </View>

            {hasRealSymptoms
              ? symptoms.map((id) => {
                  const label = SYMPTOMS.find((s) => s.id === id)?.label ?? id;
                  const value = strength[id];
                  const tag = value ? strengthTag(value, c) : null;
                  return (
                    <View key={id} style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, padding: 16, gap: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <Text style={{ flex: 1, fontSize: 16, fontWeight: "600", color: c.ink }}>{label}: how strong?</Text>
                        {tag ? (
                          <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: tag.bg }}>
                            <Text style={{ fontSize: 13, fontWeight: "500", color: tag.fg }}>{tag.text}</Text>
                          </View>
                        ) : null}
                      </View>
                      <View accessibilityRole="radiogroup" accessibilityLabel={`${label} strength from 1 to 10`} style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                          const on = value === n;
                          return (
                            <AnimatedButton
                              key={n}
                              onPress={() => {
                                if (n >= 7 && (value ?? 0) < 7) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                else Haptics.selectionAsync();
                                setStrength((prev) => ({ ...prev, [id]: n }));
                              }}
                              accessibilityRole="radio"
                              accessibilityState={{ checked: on }}
                              accessibilityLabel={`${n} out of 10`}
                              style={{
                                width: "18%",
                                flexGrow: 1,
                                height: 48,
                                borderRadius: 8,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: on ? 2 : 1,
                                borderColor: on ? c.line : c.hairline,
                                backgroundColor: on ? c.tint : c.canvas,
                              }}
                            >
                              <Text style={{ fontSize: 16, fontWeight: on ? "600" : "400", color: on ? c.onTint : c.ink }}>{n}</Text>
                            </AnimatedButton>
                          );
                        })}
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 12, color: c.slate }}>1 barely there</Text>
                        <Text style={{ fontSize: 12, color: c.slate }}>10 worst you can imagine</Text>
                      </View>
                    </View>
                  );
                })
              : null}

            {hasRealSymptoms ? (
              <View style={{ gap: 10 }}>
                <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>
                  When did it happen?
                </Text>
                <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
                  {CONTEXTS.map((x) => {
                    const on = context === x.id;
                    return (
                      <AnimatedButton
                        key={x.id}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setContext(x.id);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={x.label}
                        style={radioRow(on)}
                      >
                        <Text style={{ fontSize: 16, color: on ? c.onTint : c.ink }}>{x.label}</Text>
                        {radioDot(on)}
                      </AnimatedButton>
                    );
                  })}
                </View>
                {!context ? (
                  <Text style={{ fontSize: 13, lineHeight: 18, color: c.slate }}>
                    Pick one. Nothing is chosen for you, because it changes what the symptom may mean.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {symptomEmergency ? (
              <EmergencyCard
                c={c}
                title="Please get checked now"
                body={
                  symptoms.includes(CHEST) && (strength[CHEST] ?? 0) >= 7
                    ? `Chest discomfort rated ${strength[CHEST]} out of 10 can be a sign of a heart attack. Call 911 if it doesn't ease.`
                    : "Shortness of breath while resting can be a sign of a heart problem. Call 911 if it doesn't ease."
                }
                onCall={call911}
                onClinic={findClinic}
              />
            ) : null}
          </View>

          {/* ── Weight (optional) ── */}
          {showWeight ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: c.hairlineStrong, borderRadius: 10 }}>
              <Text style={{ fontSize: 15, color: c.charcoal }}>Weight</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <TextInput
                  value={weight}
                  onChangeText={(v) => setWeight(v.replace(/[^0-9.]/g, ""))}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  autoFocus
                  placeholder={lastReading?.weight ?? "70"}
                  placeholderTextColor={c.muted}
                  accessibilityLabel="Weight in kilograms"
                  style={{ minWidth: 64, height: 44, fontSize: 17, fontWeight: "600", color: c.ink, textAlign: "right" }}
                />
                <Text style={{ fontSize: 13, color: c.slate }}>kg</Text>
              </View>
            </View>
          ) : (
            <AnimatedButton
              onPress={() => setShowWeight(true)}
              accessibilityRole="button"
              accessibilityLabel="Add your weight, optional"
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 52, paddingHorizontal: 14, borderWidth: 1, borderColor: c.hairline, borderRadius: 10 }}
            >
              <Text style={{ fontSize: 15, color: c.ink }}>
                Add your weight <Text style={{ color: c.steel }}>(optional)</Text>
              </Text>
              <Text style={{ fontSize: 15, color: c.slate }}>{lastReading?.weight ? `Last ${lastReading.weight} kg` : ""}</Text>
            </AnimatedButton>
          )}
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 8, backgroundColor: c.canvas, borderTopWidth: 1, borderTopColor: c.hairline, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
          {blockedReason ? <Text style={{ fontSize: 13, color: c.slate, textAlign: "center" }}>{blockedReason}</Text> : null}
          <DsButton label="Save check-in" onPress={() => handleSubmit(false)} loading={isSubmitting} disabled={!!blockedReason} style={{ height: 52 }} />
        </View>
      </KeyboardAvoidingView>

      {/* Emergency guidance: rose card, red icon, dark text (never red text on pink). */}
      <Modal visible={showEmergency} transparent animationType="fade" onRequestClose={() => setShowEmergency(false)}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20, backgroundColor: "rgba(15,15,15,0.6)" }}>
          <View style={{ width: "100%", maxWidth: 400, backgroundColor: c.rose, borderRadius: 16, padding: 24 }}>
            <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: c.canvas, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 }}>
              <Feather name="alert-triangle" size={28} color={c.danger} />
            </View>
            <Text accessibilityRole="header" style={{ fontSize: 22, lineHeight: 28, fontWeight: "600", textAlign: "center", color: c.ink, marginBottom: 12 }}>
              This may be a medical emergency
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 22, textAlign: "center", color: c.charcoal, marginBottom: 24 }}>
              {isSevereHypotension
                ? "Your blood pressure reading is very low (under 90/60 mmHg)."
                : isHypertensiveCrisis
                  ? "Your blood pressure reading is very high (180/120 mmHg or higher)."
                  : symptoms.includes(CHEST) && (strength[CHEST] ?? 0) >= 7
                    ? `You rated your chest discomfort ${strength[CHEST]} out of 10. This can be a sign of a heart attack.`
                    : "You are short of breath while resting. This can be a sign of a heart problem."}
            </Text>
            <AnimatedButton
              onPress={call911}
              accessibilityRole="button"
              accessibilityLabel="Call emergency services, 911"
              style={{ height: 52, borderRadius: 8, backgroundColor: ds.light.danger, alignItems: "center", justifyContent: "center", marginBottom: 6 }}
            >
              <Text style={{ color: ds.light.onPrimary, fontSize: 16, fontWeight: "600" }}>Call 911</Text>
            </AnimatedButton>
            <DsButton
              label="Find a clinic near me"
              variant="secondary"
              onPress={() => {
                setShowEmergency(false);
                findClinic();
              }}
              style={{ backgroundColor: c.canvas, marginBottom: 20 }}
            />
            <View style={{ backgroundColor: c.canvas, borderRadius: 12, padding: 16, marginBottom: 16, gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: c.ink }}>While you wait</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>
                Sit or lie down. Stay calm. If prescribed, take aspirin only if advised by a doctor to do so. Do not drive yourself.
              </Text>
            </View>
            <AnimatedButton
              onPress={() => setShowEmergency(false)}
              accessibilityRole="button"
              accessibilityLabel="I'm safe, just logging this for later"
              style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 14, fontWeight: "500", textDecorationLine: "underline", color: c.ink }}>{"I'm safe — just logging this for later"}</Text>
            </AnimatedButton>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        visible={showIncompleteWarning}
        onCancel={() => setShowIncompleteWarning(false)}
        onConfirm={() => {
          setShowIncompleteWarning(false);
          handleSubmit(true);
        }}
        title="Save without everything?"
        message={
          reading === null && medicine === null
            ? "You haven't added your blood pressure or answered about your medicines. Save what you have?"
            : reading === null
              ? "You haven't added your blood pressure. Save what you have?"
              : "You haven't answered about your medicines. Save what you have?"
        }
        confirmLabel="Save anyway"
        variant="warning"
        icon="alert-circle"
      />
    </SafeAreaView>
  );
}

/** Shown right where the worrying answer was given: rose card, red icon, dark text. */
function EmergencyCard({ c, title, body, onCall, onClinic }: { c: DsColors; title: string; body: string; onCall: () => void; onClinic: () => void }) {
  return (
    <View accessibilityRole="alert" style={{ borderRadius: 12, padding: 16, backgroundColor: c.rose, gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
        <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: c.canvas, alignItems: "center", justifyContent: "center" }}>
          <Feather name="alert-triangle" size={18} color={c.danger} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{title}</Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>{body}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <AnimatedButton
          onPress={onCall}
          accessibilityRole="button"
          accessibilityLabel="Call 911"
          style={{ flex: 1, height: 48, borderRadius: 8, backgroundColor: ds.light.danger, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: ds.light.onPrimary }}>Call 911</Text>
        </AnimatedButton>
        <DsButton label="Find a clinic" variant="secondary" block={false} onPress={onClinic} style={{ flex: 1, backgroundColor: c.canvas }} />
      </View>
    </View>
  );
}
