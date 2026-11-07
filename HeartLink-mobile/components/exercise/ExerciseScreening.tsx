import React, { useState } from "react";
import { Text, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../ui/AnimatedButton";
import DsButton from "../onboarding/DsButton";
import { DsScreen } from "../onboarding/QuestionLayout";
import { useDs } from "../onboarding/useDs";
import { useToast } from "../../contexts/ToastContext";
import { useExerciseScreening } from "../../hooks/useExerciseScreening";
import { SCREENING_QUESTIONS, ScreeningAnswers, ScreeningStatus } from "../../constants/exerciseScreening";

const schema = z.object({
  heart_condition: z.boolean(),
  chest_pain: z.boolean(),
  fainting: z.boolean(),
  doctor_limit: z.boolean(),
  joint_problem: z.boolean(),
});

/**
 * HL-093: the pre-exercise safety check, used in setup, before the first workout and from Settings. After saving, a
 * "yes" shows the advice to get a professional's OK. It's a screening, not a diagnosis.
 */
export function ExerciseScreening({
  header,
  doneLabel = "Done",
  onDone,
  onSkip,
}: {
  header?: React.ReactNode;
  doneLabel?: string;
  onDone: () => void;
  /** Setup only: the check is asked again before the first workout. */
  onSkip?: () => void;
}) {
  const { c } = useDs();
  const { showToast } = useToast();
  const { save } = useExerciseScreening();
  const [result, setResult] = useState<ScreeningStatus | null>(null);
  const { control, handleSubmit, formState } = useForm<ScreeningAnswers>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const submit = handleSubmit((answers) =>
    save.mutate(answers, {
      onSuccess: setResult,
      onError: () => showToast({ title: "Couldn't save", message: "Check your connection and try again.", type: "error" }),
    }),
  );

  if (result) {
    return (
      <DsScreen header={header} footer={<DsButton label={doneLabel} onPress={onDone} />}>
        <View style={{ gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: result.paused ? c.rose : c.mint }}>
            <Feather name={result.paused ? "alert-triangle" : "check"} size={24} color={c.charcoal} />
          </View>
          <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "700", letterSpacing: -0.5, color: c.ink }}>
            {result.paused ? "Please get a professional's OK first" : "You're good to start gently"}
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>
            {result.paused
              ? "Based on your answers, talk to a doctor or physical therapist before active workouts. We've paused workouts and exercise suggestions for now. Breathing exercises, logging and your Heart score still work."
              : "Stop any exercise if you get chest pain, feel dizzy or can't catch your breath. Answer this check again if your health changes, in Settings."}
          </Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: c.steel }}>This is a safety check, not a diagnosis.</Text>
        </View>
      </DsScreen>
    );
  }

  return (
    <DsScreen
      header={header}
      footer={
        <>
          <DsButton label="Save my answers" onPress={submit} disabled={!formState.isValid} loading={save.isPending} />
          {onSkip ? <DsButton label="Answer later" variant="quiet" onPress={onSkip} /> : null}
        </>
      }
    >
      <View style={{ gap: 18 }}>
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "700", letterSpacing: -0.5, color: c.ink }}>
            Exercise safety check
          </Text>
          <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>
            A few questions before you exercise. If any answer is yes, we&apos;ll ask you to check with a professional first.
          </Text>
        </View>
        {SCREENING_QUESTIONS.map((q) => (
          <Controller
            key={q.id}
            control={control}
            name={q.id}
            render={({ field }) => (
              <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 14, padding: 14, gap: 12 }}>
                <Text style={{ fontSize: 15, lineHeight: 22, fontWeight: "500", color: c.ink }}>{q.text}</Text>
                <View accessibilityRole="radiogroup" accessibilityLabel={q.text} style={{ flexDirection: "row", gap: 8 }}>
                  {[
                    { label: "No", value: false },
                    { label: "Yes", value: true },
                  ].map((o) => {
                    const on = field.value === o.value;
                    return (
                      <AnimatedButton
                        key={o.label}
                        onPress={() => {
                          Haptics.selectionAsync();
                          field.onChange(o.value);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={o.label}
                        style={{
                          flex: 1,
                          height: 44,
                          borderRadius: 10,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: on ? 2 : 1,
                          borderColor: on ? c.line : c.hairline,
                          backgroundColor: on ? c.tint : c.canvas,
                        }}
                      >
                        <Text style={{ fontSize: 15, fontWeight: on ? "600" : "400", color: on ? c.onTint : c.charcoal }}>{o.label}</Text>
                      </AnimatedButton>
                    );
                  })}
                </View>
              </View>
            )}
          />
        ))}
      </View>
    </DsScreen>
  );
}
