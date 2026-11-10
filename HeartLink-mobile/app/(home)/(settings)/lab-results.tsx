import React, { useCallback, useEffect, useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { ChoiceTiles, DsTextField, YesNo } from "../../../components/onboarding/Controls";
import DsButton from "../../../components/onboarding/DsButton";
import { InfoNote } from "../../../components/onboarding/QuestionLayout";
import { useDs } from "../../../components/onboarding/useDs";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { Skeleton } from "../../../components/ui/Skeleton";
import { formatDob, parseYMD, toYMD } from "../../../constants/setupQuestions";
import { useToast } from "../../../contexts/ToastContext";
import { useUser } from "../../../contexts/UserContext";
import {
  countsText, fromMgDl, LabKind, LabResult, LabResults, LabUnit, loadLabResults, removeLabResult, saveBloodSugar,
  saveCholesterol, toMgDl, unitLabel,
} from "../../../services/labResults";

const UNITS = [
  { value: "mgdl", label: "mg/dL" },
  { value: "mmol", label: "mmol/L" },
];

// The ranges match the server's checks; they only catch typing mistakes, they don't judge the result
const number = (min: number, max: number) => (v: number | null) => v !== null && v >= min && v <= max;

function Section({ title, icon, children }: { title: string; icon: keyof typeof Feather.glyphMap; children: React.ReactNode }) {
  const { c } = useDs();
  return (
    <View style={{ gap: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: c.hairline, backgroundColor: c.canvas }}>
      <View className="flex-row items-center" style={{ gap: 10 }}>
        <View style={{ width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: c.rose }}>
          <Feather name={icon} size={17} color={c.charcoal} />
        </View>
        <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Status({ result }: { result: LabResult | null }) {
  const { c } = useDs();
  if (!result) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, lineHeight: 18, color: result.counts ? c.slate : c.warmText }}>{countsText(result)}</Text>
      {result.note ? <InfoNote icon="message-circle" text={result.note} /> : null}
    </View>
  );
}

/** The test date: the phone's date picker, or typed on the web. */
function TestDate({ value, onChange, hasError }: { value: string; onChange: (v: string) => void; hasError: boolean }) {
  const { c } = useDs();
  const [open, setOpen] = useState(false);
  if (Platform.OS === "web") {
    return <DsTextField label="Test date" value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" hasError={hasError} />;
  }
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: c.ink }}>Test date</Text>
      <AnimatedButton
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Test date, ${formatDob(value) || "not set"}`}
        style={{ height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: hasError ? c.danger : value ? c.line : c.hairlineStrong,
          paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface }}
      >
        <Feather name="calendar" size={17} color={value ? c.line : c.slate} />
        <Text style={{ fontSize: 16, color: value ? c.ink : c.steel }}>{formatDob(value) || "When was the blood taken?"}</Text>
      </AnimatedButton>
      {open ? (
        <DateTimePicker
          value={parseYMD(value) ?? new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onValueChange={(_e, date) => {
            setOpen(false);
            if (date) onChange(toYMD(date)); // local date, not toISOString (that's UTC, a day early here)
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
}

const dateOk = (v: string) => !!parseYMD(v) && (parseYMD(v) as Date) <= new Date();

const cholesterolSchema = z
  .object({ test_date: z.string(), total: z.string(), hdl: z.string(), medicine: z.boolean() })
  .refine((v) => dateOk(v.test_date), { path: ["test_date"] });
type CholesterolValues = z.infer<typeof cholesterolSchema>;

const sugarSchema = z
  .object({ test_date: z.string(), fasting: z.string(), hba1c: z.string(), diabetes: z.boolean() })
  .refine((v) => dateOk(v.test_date), { path: ["test_date"] })
  .refine((v) => !!v.fasting.trim() || !!v.hba1c.trim(), { path: ["hba1c"] });
type SugarValues = z.infer<typeof sugarSchema>;

type SectionProps = { userId: string; unit: LabUnit; result: LabResult | null; onChanged: (message: string) => void; onAskRemove: (kind: LabKind) => void };

function CholesterolForm({ userId, unit, result, onChanged, onAskRemove }: SectionProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const { control, setValue, handleSubmit, formState: { isValid, errors } } = useForm<CholesterolValues>({
    resolver: zodResolver(cholesterolSchema),
    mode: "onChange",
    defaultValues: {
      test_date: result?.test_date ?? "",
      total: fromMgDl(result?.total_cholesterol, unit, "cholesterol"),
      hdl: fromMgDl(result?.hdl, unit, "cholesterol"),
      medicine: result?.cholesterol_medicine,
    },
  });
  const v = useWatch({ control });
  const set = (name: keyof CholesterolValues) => (value: string | boolean) => setValue(name, value as never, { shouldValidate: true });

  const save = handleSubmit(async (values) => {
    const total = toMgDl(values.total, unit, "cholesterol");
    const hdl = toMgDl(values.hdl, unit, "cholesterol");
    if (!number(50, 600)(total) || !number(5, 200)(hdl) || (hdl as number) >= (total as number)) {
      showToast({ title: "Check the numbers", message: `Total cholesterol and HDL in ${unitLabel(unit)}, with HDL lower than the total`, type: "error" });
      return;
    }
    setSaving(true);
    try {
      await saveCholesterol(userId, { test_date: values.test_date, total_cholesterol: total as number, hdl: hdl as number, cholesterol_medicine: values.medicine });
      onChanged("Cholesterol saved");
    } catch (e) {
      showToast({ title: "Not saved", message: e instanceof Error ? e.message : "Try again", type: "error" });
    } finally {
      setSaving(false);
    }
  });

  return (
    <Section title="Cholesterol" icon="droplet">
      <Status result={result} />
      <TestDate value={v.test_date ?? ""} onChange={set("test_date")} hasError={!!errors.test_date && !!v.test_date} />
      <View className="flex-row" style={{ gap: 12 }}>
        <View className="flex-1">
          <DsTextField label="Total cholesterol" unit={unitLabel(unit)} value={v.total ?? ""} onChangeText={set("total")} keyboardType="decimal-pad" maxLength={5} />
        </View>
        <View className="flex-1">
          <DsTextField label="HDL" unit={unitLabel(unit)} value={v.hdl ?? ""} onChangeText={set("hdl")} keyboardType="decimal-pad" maxLength={5} />
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: "600" }} className="text-ds-ink">Do you take cholesterol medicine (like a statin)?</Text>
        <YesNo value={v.medicine} onChange={set("medicine")} accessibilityLabel="Do you take cholesterol medicine?" />
      </View>
      <DsButton label={result ? "Save new result" : "Save cholesterol"} onPress={save} disabled={!isValid || !v.total || !v.hdl || v.medicine === undefined} loading={saving} />
      {result ? <DsButton label="Remove cholesterol result" variant="quiet" onPress={() => onAskRemove("cholesterol")} /> : null}
    </Section>
  );
}

function BloodSugarForm({ userId, unit, result, onChanged, onAskRemove }: SectionProps) {
  const { c } = useDs();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const { control, setValue, handleSubmit, formState: { isValid, errors } } = useForm<SugarValues>({
    resolver: zodResolver(sugarSchema),
    mode: "onChange",
    defaultValues: {
      test_date: result?.test_date ?? "",
      fasting: fromMgDl(result?.fasting_glucose, unit, "glucose"),
      hba1c: result?.hba1c !== undefined && result?.hba1c !== null ? String(result.hba1c) : "",
      diabetes: result?.has_diabetes,
    },
  });
  const v = useWatch({ control });
  const set = (name: keyof SugarValues) => (value: string | boolean) => setValue(name, value as never, { shouldValidate: true });

  const save = handleSubmit(async (values) => {
    const fasting = values.fasting.trim() ? toMgDl(values.fasting, unit, "glucose") : null;
    const hba1c = values.hba1c.trim() ? Number(values.hba1c.trim().replace(",", ".")) : null;
    if ((values.fasting.trim() && !number(30, 700)(fasting)) || (hba1c !== null && !number(3, 20)(hba1c))) {
      showToast({ title: "Check the numbers", message: `Fasting blood sugar in ${unitLabel(unit)}, HbA1c in percent`, type: "error" });
      return;
    }
    setSaving(true);
    try {
      await saveBloodSugar(userId, { test_date: values.test_date, fasting_glucose: fasting, hba1c, has_diabetes: values.diabetes });
      onChanged("Blood sugar saved");
    } catch (e) {
      showToast({ title: "Not saved", message: e instanceof Error ? e.message : "Try again", type: "error" });
    } finally {
      setSaving(false);
    }
  });

  return (
    <Section title="Blood sugar" icon="activity">
      <Status result={result} />
      <TestDate value={v.test_date ?? ""} onChange={set("test_date")} hasError={!!errors.test_date && !!v.test_date} />
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: "600" }} className="text-ds-ink">Have you been told you have diabetes?</Text>
        <YesNo value={v.diabetes} onChange={set("diabetes")} accessibilityLabel="Have you been told you have diabetes?" />
      </View>
      <View className="flex-row" style={{ gap: 12 }}>
        <View className="flex-1">
          <DsTextField label="HbA1c" unit="%" value={v.hba1c ?? ""} onChangeText={set("hba1c")} keyboardType="decimal-pad" maxLength={4} />
        </View>
        <View className="flex-1">
          <DsTextField label="Fasting blood sugar" optional unit={unitLabel(unit)} value={v.fasting ?? ""} onChangeText={set("fasting")} keyboardType="decimal-pad" maxLength={5} />
        </View>
      </View>
      <Text style={{ fontSize: 12.5, lineHeight: 18, color: c.steel }}>
        {v.diabetes
          ? "With diabetes, the AHA scores HbA1c only, so add your HbA1c."
          : "Enter whichever you have. HbA1c is used if you add both."}
      </Text>
      <DsButton
        label={result ? "Save new result" : "Save blood sugar"}
        onPress={save}
        disabled={!isValid || v.diabetes === undefined || (v.diabetes === true && !v.hba1c?.trim())}
        loading={saving}
      />
      {result ? <DsButton label="Remove blood sugar result" variant="quiet" onPress={() => onAskRemove("blood_sugar")} /> : null}
    </Section>
  );
}

/** HL-138: optional lab results. Each counts in the Heart score for 12 months from the test date. */
export default function LabResultsScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { userId } = useUser();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [results, setResults] = useState<LabResults | null>(null);
  const [failed, setFailed] = useState(false);
  const [unit, setUnit] = useState<LabUnit>("mgdl");
  const [removing, setRemoving] = useState<LabKind | null>(null);
  // Forms start from the saved results; a new key re-creates them after a save or a unit change
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setResults(await loadLabResults(userId));
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let live = true;
    loadLabResults(userId)
      .then((found) => {
        if (live) setResults(found);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [userId]);

  const changed = async (message: string) => {
    await load();
    setVersion((n) => n + 1);
    await queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
    showToast({ title: message, message: "Your Heart score is up to date.", type: "success" });
  };

  const remove = async () => {
    if (!userId || !removing) return;
    try {
      await removeLabResult(userId, removing);
      setRemoving(null);
      await changed("Result removed");
    } catch {
      setRemoving(null);
      showToast({ title: "Not removed", message: "Check your connection and try again.", type: "error" });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink flex-1" numberOfLines={1}>
          Lab results
        </Text>
      </View>

      {failed ? (
        <View className="flex-1 items-center justify-center" style={{ padding: 24, gap: 14 }}>
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal, textAlign: "center" }}>
            We couldn&apos;t load your lab results. Check your connection and try again.
          </Text>
          <DsButton label="Try again" variant="secondary" onPress={load} />
        </View>
      ) : !results || !userId ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }} accessibilityLabel="Loading your lab results">
          <Skeleton style={{ height: 76, borderRadius: 12 }} />
          <Skeleton style={{ height: 260, borderRadius: 12 }} />
          <Skeleton style={{ height: 260, borderRadius: 12 }} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60, gap: 20 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <InfoNote
            title="Optional"
            text="If you've had a blood test, add the results so your Heart score covers cholesterol and blood sugar too. Each result counts for 12 months from the test date. This isn't a diagnosis: talk to your doctor about your results."
          />
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.ink }}>Units on your lab result</Text>
            <ChoiceTiles
              options={UNITS}
              value={unit}
              onChange={(u) => {
                setUnit(u as LabUnit);
                setVersion((n) => n + 1);
              }}
              accessibilityLabel="Units on your lab result"
            />
          </View>
          <CholesterolForm key={`chol-${version}`} userId={userId} unit={unit} result={results.cholesterol} onChanged={changed} onAskRemove={setRemoving} />
          <BloodSugarForm key={`sugar-${version}`} userId={userId} unit={unit} result={results.blood_sugar} onChanged={changed} onAskRemove={setRemoving} />
        </ScrollView>
      )}

      <ConfirmDialog
        visible={!!removing}
        onCancel={() => setRemoving(null)}
        onConfirm={remove}
        title={removing === "cholesterol" ? "Remove your cholesterol result?" : "Remove your blood sugar result?"}
        message="Your Heart score goes back to leaving this area out. You can add a result again anytime."
        confirmLabel="Remove"
        cancelLabel="Keep it"
        variant="destructive"
      />
    </SafeAreaView>
  );
}
