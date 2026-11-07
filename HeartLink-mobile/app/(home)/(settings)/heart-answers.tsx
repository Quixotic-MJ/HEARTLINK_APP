import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { ChoiceList, YesNo } from "../../../components/onboarding/Controls";
import DsButton from "../../../components/onboarding/DsButton";
import { InfoNote } from "../../../components/onboarding/QuestionLayout";
import { useDs } from "../../../components/onboarding/useDs";
import { Skeleton } from "../../../components/ui/Skeleton";
import { QUIT_OPTIONS } from "../../../constants/setupQuestions";
import { useToast } from "../../../contexts/ToastContext";
import { useUser } from "../../../contexts/UserContext";
import { loadHeartAnswers, saveHeartAnswers } from "../../../services/heartScore";

const OFTEN = [
  { value: "rarely", label: "Rarely" },
  { value: "sometimes", label: "Sometimes" },
  { value: "often", label: "Often" },
  { value: "daily", label: "Every day" },
];
const FRUIT_VEG = [
  { value: "0-1", label: "0–1 servings" },
  { value: "2-3", label: "2–3 servings" },
  { value: "4-5", label: "4–5 servings" },
  { value: "6+", label: "6 or more servings" },
];
const SMOKE_NOW = [
  { value: "Every day", label: "Yes, every day" },
  { value: "Some days", label: "Yes, on some days" },
  { value: "Not at all", label: "No, I've quit" },
];

const schema = z
  .object({
    ever_smoked: z.boolean(),
    smoke_now: z.string().nullable().optional(),
    smoke_quit_when: z.string().nullable().optional(),
    fruit_veg_servings: z.string().min(1),
    fried_food_freq: z.string().min(1),
    salty_food_freq: z.string().min(1),
  })
  .refine((a) => !a.ever_smoked || !!a.smoke_now, { path: ["smoke_now"] })
  .refine((a) => !a.ever_smoked || a.smoke_now !== "Not at all" || !!a.smoke_quit_when, { path: ["smoke_quit_when"] });

type Values = z.infer<typeof schema>;

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useDs();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>{title}</Text>
      {children}
    </View>
  );
}

/** HL-114: the Heart score's smoking and diet answers can change after setup. */
export default function HeartAnswersScreen() {
  const { c, isDark } = useDs();
  const router = useRouter();
  const { userId } = useUser();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [saving, setSaving] = useState(false);
  const { control, handleSubmit, reset, setValue, formState: { isValid } } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });
  const answers = useWatch({ control });

  useEffect(() => {
    if (!userId) return;
    let live = true;
    loadHeartAnswers(userId)
      .then((saved) => {
        if (!live) return;
        reset(saved as Values);
        setStatus("ready");
      })
      .catch(() => {
        if (live) setStatus("failed");
      });
    return () => {
      live = false;
    };
  }, [userId, reset]);

  const pick = (name: keyof Values) => (value: string | boolean) => setValue(name, value as never, { shouldValidate: true });

  const save = handleSubmit(async (values) => {
    if (!userId) return;
    setSaving(true);
    try {
      await saveHeartAnswers(userId, values);
      await queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
      showToast({ title: "Answers saved", message: "Your Heart score is up to date.", type: "success" });
      router.back();
    } catch {
      showToast({ title: "Not saved", message: "Check your connection and try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-ds-canvas" edges={["top"]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View className="flex-row items-center px-5 pt-3 pb-3 border-b border-ds-hairline bg-ds-canvas" style={{ gap: 12 }}>
        <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        <Text accessibilityRole="header" className="text-[22px] font-semibold text-ds-ink flex-1" numberOfLines={1}>
          Smoking and diet answers
        </Text>
      </View>

      {status === "failed" ? (
        <View className="flex-1 items-center justify-center" style={{ padding: 24 }}>
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal, textAlign: "center" }}>
            We couldn&apos;t load your answers. Check your connection and try again.
          </Text>
        </View>
      ) : status === "loading" ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }} accessibilityLabel="Loading your answers">
          <Skeleton style={{ height: 76, borderRadius: 12 }} />
          <Skeleton style={{ height: 120, borderRadius: 12 }} />
          <Skeleton style={{ height: 180, borderRadius: 12 }} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60, gap: 28 }} showsVerticalScrollIndicator={false}>
          <InfoNote title="Why we ask" text="These answers set the nicotine and diet parts of your Heart score. Update them when your habits change." />

          <Question title="Have you ever smoked regularly?">
            <YesNo value={answers.ever_smoked} onChange={pick("ever_smoked")} accessibilityLabel="Have you ever smoked regularly?" />
          </Question>

          {answers.ever_smoked ? (
            <Question title="Do you smoke now? Include vapes and other tobacco.">
              <ChoiceList options={SMOKE_NOW} value={answers.smoke_now ?? undefined} onChange={pick("smoke_now")} accessibilityLabel="Do you smoke now?" />
            </Question>
          ) : null}

          {answers.ever_smoked && answers.smoke_now === "Not at all" ? (
            <Question title="When did you quit?">
              <ChoiceList options={QUIT_OPTIONS} value={answers.smoke_quit_when ?? undefined} onChange={pick("smoke_quit_when")} accessibilityLabel="When did you quit?" />
            </Question>
          ) : null}

          <Question title="Fruit and vegetables a day">
            <ChoiceList options={FRUIT_VEG} value={answers.fruit_veg_servings} onChange={pick("fruit_veg_servings")} accessibilityLabel="Fruit and vegetables a day" />
          </Question>

          <Question title="How often do you eat fried or fatty foods?">
            <ChoiceList options={OFTEN} value={answers.fried_food_freq} onChange={pick("fried_food_freq")} accessibilityLabel="How often do you eat fried or fatty foods?" />
          </Question>

          <Question title="How often do you eat salty or processed foods?">
            <ChoiceList options={OFTEN} value={answers.salty_food_freq} onChange={pick("salty_food_freq")} accessibilityLabel="How often do you eat salty or processed foods?" />
          </Question>

          <DsButton label="Save answers" onPress={save} disabled={!isValid} loading={saving} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
