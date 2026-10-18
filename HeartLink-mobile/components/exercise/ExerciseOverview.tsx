import React from "react";
import { ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import DsButton from "../onboarding/DsButton";
import { useDs } from "../onboarding/useDs";
import { SquareIconButton, Tag } from "./ExerciseBits";
import { ExerciseVideo, PictureThumb } from "./ExerciseMedia";
import { ExerciseKind, Routine, SECTION_NAME, describePart, routineSeconds } from "../../services/exerciseSession";

// Screen 1: what the exercise is and how to do it, then Start. When workouts are paused for
// safety (screen 1b) a rose card explains why and Start is turned off.

export interface ExerciseOverviewProps {
  routine: Routine;
  kind: ExerciseKind;
  paused: boolean;
  /** The pause comes from a recent severe symptom, which a doctor can clear. */
  canClearPause: boolean;
  /** Still checking today's score and symptoms. */
  checking: boolean;
  onStart: () => void;
  onBack: () => void;
  onClearPause: () => void;
  onFindBreathing: () => void;
}

/** A labelled line in the "how it should feel / how often" box. */
function InfoRow({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  const { c } = useDs();
  return (
    <View className="flex-row" style={{ gap: 10 }}>
      <Feather name={icon} size={18} color={c.charcoal} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 13, color: c.slate }}>{label}</Text>
        <Text style={{ fontSize: 15, lineHeight: 22, color: c.ink }}>{value}</Text>
      </View>
    </View>
  );
}

/** One section of "How to do it": numbered parts, each with its time or count, and its picture (tap to enlarge). */
function PartList({ title, items }: { title: string; items: { text: string; details: string; amount?: string; image?: string }[] }) {
  const { c } = useDs();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontSize: 15, fontWeight: "600", color: c.charcoal }}>{title}</Text>
      {items.map((step, i) => (
        <View key={i} className="flex-row" style={{ gap: 12 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.surface, borderWidth: 1, borderColor: c.hairline, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.ink }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontSize: 15, lineHeight: 22, color: c.ink }}>{step.text}</Text>
            {step.details ? <Text style={{ fontSize: 14, lineHeight: 20, color: c.slate }}>{step.details}</Text> : null}
            {step.amount ? <Text style={{ fontSize: 14, fontWeight: "500", color: c.charcoal }}>{step.amount}</Text> : null}
          </View>
          {step.image ? <PictureThumb uri={step.image} label={step.text} /> : null}
        </View>
      ))}
    </View>
  );
}

export function ExerciseOverview({ routine, kind, paused, canClearPause, checking, onStart, onBack, onClearPause, onFindBreathing }: ExerciseOverviewProps) {
  const { c } = useDs();
  const insets = useSafeAreaInsets();
  const kindLabel = { breathing: "Breathing", cardio: "Light cardio", steps: "Move by move", guide: "Guided" }[kind];
  const minutes = Math.max(1, Math.round(routineSeconds(routine) / 60));

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 200 + insets.top, backgroundColor: c.mint, alignItems: "center", justifyContent: "center" }}>
          <Feather name={kind === "breathing" ? "wind" : "activity"} size={44} color={c.charcoal} />
          {routine.image ? (
            <Image source={{ uri: routine.image }} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
          ) : null}
          <View style={{ position: "absolute", top: insets.top + 12, left: 16 }}>
            <SquareIconButton icon="arrow-left" label="Go back" onPress={onBack} />
          </View>
        </View>

        <View className="px-5" style={{ paddingTop: 20, gap: 14 }}>
          {paused ? (
            <View style={{ backgroundColor: c.rose, borderRadius: 12, padding: 16, gap: 12 }}>
              <View className="flex-row" style={{ gap: 12 }}>
                <Feather name="alert-triangle" size={22} color={c.danger} style={{ marginTop: 1 }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: "600", color: c.ink }}>
                    Workouts are paused for now
                  </Text>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: c.charcoal }}>
                    Your latest readings or symptoms suggest resting today. Breathing exercises are still open. If something feels wrong, get checked in person.
                  </Text>
                </View>
              </View>
              {canClearPause ? <DsButton label="A doctor cleared me to exercise" variant="secondary" onPress={onClearPause} style={{ backgroundColor: c.canvas }} /> : null}
            </View>
          ) : null}

          <Text accessibilityRole="header" style={{ fontSize: 26, lineHeight: 32, fontWeight: "600", color: c.ink }}>
            {routine.title}
          </Text>
          <View className="flex-row flex-wrap" style={{ gap: 8 }}>
            <Tag label={`${minutes} min`} tone="sky" />
            <Tag label={`${routine.intensity} intensity`} tone="mint" />
            {routine.position ? <Tag label={routine.position} /> : <Tag label={kindLabel} />}
            {routine.setting && routine.setting !== "Either" ? <Tag label={routine.setting} /> : null}
          </View>
          {routine.description ? <Text style={{ fontSize: 15, lineHeight: 22, color: c.slate }}>{routine.description}</Text> : null}

          {routine.effortHint || routine.frequency ? (
            <View style={{ borderWidth: 1, borderColor: c.hairline, borderRadius: 12, padding: 14, gap: 10 }}>
              {routine.effortHint ? <InfoRow icon="thermometer" label="How it should feel" value={routine.effortHint} /> : null}
              {routine.frequency ? <InfoRow icon="calendar" label="How often" value={routine.frequency} /> : null}
            </View>
          ) : null}

          {routine.goal && routine.goal !== routine.description ? (
            <View style={{ gap: 6 }}>
              <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>
                Why it helps
              </Text>
              <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>{routine.goal}</Text>
            </View>
          ) : null}

          {routine.skipIf.length > 0 ? (
            <View style={{ backgroundColor: c.yellow, borderRadius: 12, padding: 14, gap: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Skip this exercise today if:</Text>
              {routine.skipIf.map((reason) => (
                <Text key={reason} style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>
                  • {reason}
                </Text>
              ))}
            </View>
          ) : null}

          {routine.requirements.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>
                {"You'll need"}
              </Text>
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {routine.requirements.map((need) => (
                  <Tag key={need} label={need} />
                ))}
              </View>
            </View>
          ) : null}

          {routine.videoUrl ? (
            <View style={{ gap: 8 }}>
              <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>
                {"Watch how it's done"}
              </Text>
              <ExerciseVideo url={routine.videoUrl} />
            </View>
          ) : null}

          {routine.setup.length > 0 || routine.steps.length > 0 ? (
            <View style={{ gap: 14 }}>
              <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: "600", color: c.ink }}>
                How to do it
              </Text>
              {routine.setup.length > 0 ? <PartList title="Get into position" items={routine.setup.map((s) => ({ text: s.text, details: s.details, image: s.image }))} /> : null}
              {kind === "breathing" ? (
                <PartList title="One round, repeated" items={routine.steps.map((s) => ({ text: s.text, details: s.details, amount: `${s.seconds} s`, image: s.image }))} />
              ) : (
                (["warmup", "main", "cooldown"] as const).map((section) => {
                  const parts = routine.steps.filter((s) => s.section === section);
                  if (parts.length === 0) return null;
                  const title =
                    section === "main" && routine.rounds > 1
                      ? `${SECTION_NAME.main}, ${routine.rounds} rounds${routine.restSeconds ? ` with ${routine.restSeconds} s rest between` : ""}`
                      : SECTION_NAME[section];
                  return <PartList key={section} title={title} items={parts.map((s) => ({ text: s.text, details: s.details, amount: describePart(s), image: s.image }))} />;
                })
              )}
            </View>
          ) : null}

          {routine.easierVersion ? (
            <View style={{ backgroundColor: c.surface, borderRadius: 12, padding: 14, gap: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: c.ink }}>Too hard today?</Text>
              <Text style={{ fontSize: 15, lineHeight: 22, color: c.charcoal }}>{routine.easierVersion}</Text>
            </View>
          ) : null}

          <View className="flex-row" style={{ backgroundColor: c.surface, borderRadius: 12, padding: 14, gap: 12 }}>
            <Feather name="heart" size={20} color={c.charcoal} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: c.charcoal }}>
              {'Stop and tap "I feel unwell" if you get chest pain, feel dizzy or can\'t catch your breath.'}
            </Text>
          </View>

          {routine.reviewedAt ? (
            <View className="flex-row items-center" style={{ gap: 8 }}>
              <Feather name="check-circle" size={16} color={c.success} />
              <Text style={{ fontSize: 13, color: c.slate }}>
                Checked by a HeartLink expert on {new Date(routine.reviewedAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View className="px-5" style={{ paddingTop: 12, paddingBottom: Math.max(insets.bottom, 16) + 8, borderTopWidth: 1, borderTopColor: c.hairlineSoft, gap: 4 }}>
        {paused ? (
          <>
            <DsButton label="Paused for today" disabled onPress={onStart} />
            <DsButton label="Try a breathing exercise" variant="link" onPress={onFindBreathing} style={{ alignSelf: "center" }} />
          </>
        ) : (
          <DsButton label="Start exercise" loading={checking} onPress={onStart} />
        )}
      </View>
    </View>
  );
}
