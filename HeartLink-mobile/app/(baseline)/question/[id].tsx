import React, { useState } from "react";
import { Platform, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import AnimatedButton from "../../../components/ui/AnimatedButton";
import DsButton from "../../../components/onboarding/DsButton";
import SetupHeader from "../../../components/onboarding/SetupHeader";
import FinishLaterDialog from "../../../components/onboarding/FinishLaterDialog";
import QuestionLayout, { Tag } from "../../../components/onboarding/QuestionLayout";
import {
  ChoiceList,
  ChoiceTiles,
  CheckList,
  ChipGroup,
  DsTextField,
  StepperCard,
  YesNo,
} from "../../../components/onboarding/Controls";
import { useDs } from "../../../components/onboarding/useDs";
import { BaselineData, useBaseline } from "../../../contexts/BaselineContext";
import {
  SetupQuestion,
  ageFrom,
  formatDob,
  isAnswered,
  parseYMD,
  partOf,
  questionById,
  toYMD,
  visibleQuestions,
} from "../../../constants/setupQuestions";

function errorFor(q: SetupQuestion): string {
  switch (q.kind) {
    case "name":
      return "Please enter your first name.";
    case "dob":
      return "Please choose your date of birth.";
    case "body":
      return "Enter a height between 50 and 300 cm and a weight between 20 and 400 kg.";
    case "goals":
      return "Pick at least one goal.";
    case "allergies":
      return "Pick at least one, or None.";
    default:
      return "Please choose an answer to continue.";
  }
}

// One set-up question per screen. Which question is shown comes from constants/setupQuestions.ts.
export default function QuestionScreen() {
  const router = useRouter();
  const { c } = useDs();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { data, updateData } = useBaseline();
  const q = questionById(id ?? "");

  const [showError, setShowError] = useState(false);
  const [finishLater, setFinishLater] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  // Text answers are kept locally while typing and saved on Next.
  const [first, setFirst] = useState(data.first_name);
  const [last, setLast] = useState(data.last_name);
  const [height, setHeight] = useState(data.height_cm);
  const [weight, setWeight] = useState(data.weight_kg);
  const [dobText, setDobText] = useState(data.date_of_birth);

  if (!q) {
    return (
      <QuestionLayout header={<SetupHeader onBack={() => router.replace("/(baseline)/plan")} />} footer={null} title="This question couldn't be found.">
        <DsButton label="Back to set-up" onPress={() => router.replace("/(baseline)/plan")} />
      </QuestionLayout>
    );
  }

  const part = partOf(q.part);
  const inPart = visibleQuestions(data, q.part);
  const indexInPart = Math.max(0, inPart.findIndex((x) => x.id === q.id));
  const progress = (indexInPart + 0.5) / inPart.length;
  const lastInPart = indexInPart === inPart.length - 1;

  const set = (updates: Partial<BaselineData>) => {
    setShowError(false);
    updateData(updates);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(baseline)/plan");
  };

  const goNext = () => {
    // Save text answers first, then check against the merged answers.
    let merged = data;
    if (q.kind === "name") {
      merged = { ...data, first_name: first.trim(), last_name: last.trim() };
      updateData({ first_name: first.trim(), last_name: last.trim() });
    } else if (q.kind === "body") {
      merged = { ...data, height_cm: height.trim(), weight_kg: weight.trim() };
      updateData({ height_cm: height.trim(), weight_kg: weight.trim() });
    } else if (q.kind === "dob" && Platform.OS === "web") {
      const valid = parseYMD(dobText) ? dobText.trim() : "";
      merged = { ...data, date_of_birth: valid };
      updateData({ date_of_birth: valid });
    }

    if (!isAnswered(q, merged)) {
      setShowError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    // Editing from a recap: go straight back to it.
    if (from === "recap") {
      goBack();
      return;
    }

    const all = visibleQuestions(merged);
    const next = all[all.findIndex((x) => x.id === q.id) + 1];
    if (next && next.part === q.part) {
      router.push({ pathname: "/(baseline)/question/[id]", params: { id: next.id } });
    } else if (q.part < 4) {
      router.push({ pathname: "/(baseline)/part-done", params: { part: String(q.part) } });
    } else {
      router.push("/(baseline)/score");
    }
  };

  const nextLabel = from === "recap" ? "Save" : lastInPart ? (q.part === 4 ? "See my starting score" : `Finish ${part.name}`) : "Next";

  // ── Answer controls for each kind of question ──
  let body: React.ReactNode = null;
  switch (q.kind) {
    case "name":
      body = (
        <View style={{ gap: 16 }}>
          <DsTextField label="First name" value={first} onChangeText={setFirst} autoCapitalize="words" autoComplete="given-name" hasError={showError} returnKeyType="next" />
          <DsTextField label="Last name" optional value={last} onChangeText={setLast} autoCapitalize="words" autoComplete="family-name" placeholder="Enter your last name" />
        </View>
      );
      break;
    case "dob": {
      const age = ageFrom(data.date_of_birth);
      body =
        Platform.OS === "web" ? (
          <DsTextField label="Date of birth" value={dobText} onChangeText={setDobText} placeholder="YYYY-MM-DD" hasError={showError} />
        ) : (
          <>
            <AnimatedButton
              onPress={() => setShowPicker(true)}
              accessibilityRole="button"
              accessibilityLabel={`Date of birth, ${formatDob(data.date_of_birth) || "not set"}`}
              style={{
                height: 56,
                borderRadius: 8,
                borderWidth: data.date_of_birth || showError ? 2 : 1,
                borderColor: showError ? c.danger : data.date_of_birth ? c.line : c.hairlineStrong,
                paddingHorizontal: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                backgroundColor: c.canvas,
              }}
            >
              <Feather name="calendar" size={20} color={c.slate} />
              <Text style={{ flex: 1, fontSize: 17, fontWeight: data.date_of_birth ? "500" : "400", color: data.date_of_birth ? c.ink : c.steel }}>
                {formatDob(data.date_of_birth) || "Select your birth date"}
              </Text>
              {age !== null ? <Tag label={`Age ${age}`} align="center" /> : null}
            </AnimatedButton>
            {showPicker ? (
              <DateTimePicker
                value={parseYMD(data.date_of_birth) ?? new Date(1990, 0, 1)}
                mode="date"
                display="default"
                maximumDate={new Date()}
                onChange={(event, date) => {
                  setShowPicker(false);
                  // Local date, not toISOString(): that is UTC and saved the day before in the Philippines.
                  if (event.type === "set" && date) set({ date_of_birth: toYMD(date) });
                }}
              />
            ) : null}
          </>
        );
      break;
    }
    case "body":
      body = (
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="flex-1">
            <DsTextField label="Height" unit="cm" large value={height} onChangeText={setHeight} keyboardType="numeric" maxLength={3} placeholder="160" hasError={showError} />
          </View>
          <View className="flex-1">
            <DsTextField label="Weight" unit="kg" large value={weight} onChangeText={setWeight} keyboardType="numeric" maxLength={3} placeholder="65" hasError={showError} />
          </View>
        </View>
      );
      break;
    case "choice":
      body = (
        <ChoiceList
          options={q.options}
          value={data[q.field] || undefined}
          onChange={(v) => set({ [q.field]: v } as Partial<BaselineData>)}
          accessibilityLabel={q.title}
          hasError={showError}
        />
      );
      break;
    case "tiles":
      body = (
        <ChoiceTiles
          options={q.options}
          value={data[q.field] || undefined}
          onChange={(v) => set({ [q.field]: v } as Partial<BaselineData>)}
          accessibilityLabel={q.title}
          caption={q.caption}
        />
      );
      break;
    case "yesno": {
      const answered = data.answered[q.field];
      const yes = answered ? data[q.field] : undefined;
      const pick = (v: boolean) => {
        const updates: Partial<BaselineData> = { [q.field]: v, answered: { ...data.answered, [q.field]: true } };
        if (q.days && q.minutes) {
          if (v) {
            if (!data[q.days]) updates[q.days] = "3";
            if (!data[q.minutes]) updates[q.minutes] = "30";
          } else {
            updates[q.days] = undefined;
            updates[q.minutes] = undefined;
          }
        }
        // A "No" clears the follow-up answers it hides.
        if (!v && q.field === "ever_smoked") updates.smoke_now = undefined;
        if (!v && q.field === "ever_drank") {
          updates.drink_frequency = undefined;
          updates.drinks_per_occasion = undefined;
          updates.binge_drinking_freq = undefined;
        }
        set(updates);
      };
      body = (
        <>
          <YesNo value={yes} onChange={pick} accessibilityLabel={q.title} />
          {yes && q.days && q.minutes ? (
            <View style={{ marginTop: 16 }}>
              <StepperCard
                rows={[
                  { label: "Days a week", value: parseInt(data[q.days] || "3", 10), min: 1, max: 7, step: 1, onChange: (v) => set({ [q.days as string]: String(v) } as Partial<BaselineData>) },
                  { label: "Minutes each time", value: parseInt(data[q.minutes] || "30", 10), min: 10, max: 180, step: 5, onChange: (v) => set({ [q.minutes as string]: String(v) } as Partial<BaselineData>) },
                ]}
              />
            </View>
          ) : q.yesHint && !answered ? (
            <Text style={{ fontSize: 13, lineHeight: 18, color: c.steel, marginTop: 12 }}>{q.yesHint}</Text>
          ) : null}
        </>
      );
      break;
    }
    case "goals":
      body = (
        <CheckList
          options={q.options}
          selected={data.health_goals}
          accessibilityLabel={q.title}
          onToggle={(v) =>
            set({ health_goals: data.health_goals.includes(v) ? data.health_goals.filter((g) => g !== v) : [...data.health_goals, v] })
          }
        />
      );
      break;
    case "allergies":
      body = (
        <ChipGroup
          options={q.options}
          selected={data.allergies}
          accessibilityLabel={q.title}
          onToggle={(v) => {
            // "None" can't be combined with an allergy.
            if (v === "None") {
              set({ allergies: data.allergies.includes("None") ? [] : ["None"] });
              return;
            }
            const rest = data.allergies.filter((a) => a !== "None");
            set({ allergies: rest.includes(v) ? rest.filter((a) => a !== v) : [...rest, v] });
          }}
        />
      );
      break;
  }

  return (
    <>
      <QuestionLayout
        header={
          <SetupHeader
            part={q.part}
            partName={part.name}
            progress={progress}
            fromProgress={Math.max(0, (indexInPart - 0.5) / inPart.length)}
            onBack={goBack}
            onFinishLater={() => setFinishLater(true)}
          />
        }
        footer={<DsButton label={nextLabel} onPress={goNext} />}
        icon={q.icon}
        tint={part.tint}
        tag={q.tag}
        title={q.kind === "dob" && data.first_name ? `When were you born, ${data.first_name}?` : q.title}
        subtitle={q.subtitle}
        why={q.why}
        note={q.note}
      >
        {body}
        {showError ? (
          <Animated.Text entering={FadeIn.duration(200)} accessibilityRole="alert" style={{ fontSize: 14, color: c.danger, marginTop: 12 }}>
            {errorFor(q)}
          </Animated.Text>
        ) : null}
      </QuestionLayout>
      <FinishLaterDialog visible={finishLater} onClose={() => setFinishLater(false)} />
    </>
  );
}
