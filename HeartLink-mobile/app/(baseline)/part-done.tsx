import React, { useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Animated, { ZoomIn } from "react-native-reanimated";
import AnimatedButton from "../../components/ui/AnimatedButton";
import DsButton from "../../components/onboarding/DsButton";
import SetupHeader from "../../components/onboarding/SetupHeader";
import FinishLaterDialog from "../../components/onboarding/FinishLaterDialog";
import { DsScreen, IconBadge, tintColor } from "../../components/onboarding/QuestionLayout";
import { useDs } from "../../components/onboarding/useDs";
import { BaselineData, useBaseline } from "../../contexts/BaselineContext";
import { PartNumber, SetupQuestion, formatDob, partOf, visibleQuestions } from "../../constants/setupQuestions";

const SHORT_LABEL: Record<string, string> = {
  name: "Name",
  dob: "Date of birth",
  sex: "Sex at birth",
  body: "Height & weight",
  vigorous: "Hard exercise",
  moderate: "Moderate activity",
  walk: "Walk or bike",
  sitting: "Sitting time",
  sleep: "Sleep",
  "ever-smoked": "Ever smoked",
  "smoke-now": "Smoke now",
  alcohol: "Alcohol",
  "alcohol-often": "How often",
  "alcohol-amount": "Drinks per day",
  "alcohol-heavy": "6+ drinks at once",
};

function answerText(q: SetupQuestion, d: BaselineData): string {
  switch (q.kind) {
    case "name":
      return [d.first_name, d.last_name].filter(Boolean).join(" ");
    case "dob":
      return formatDob(d.date_of_birth);
    case "body":
      return `${d.height_cm} cm, ${d.weight_kg} kg`;
    case "choice":
    case "tiles": {
      const v = d[q.field];
      return q.options.find((o) => o.value === v)?.label ?? "";
    }
    case "yesno": {
      if (!d[q.field]) return "No";
      if (q.days && q.minutes) return `Yes, ${d[q.days]} days a week, ${d[q.minutes]} min`;
      return "Yes";
    }
    case "goals":
      return q.options.filter((o) => d.health_goals.includes(o.value)).map((o) => o.label).join(", ");
    case "allergies":
      return d.allergies.join(", ");
  }
}

// Recap after a part: what they answered, with Edit links, and what comes next.
export default function PartDoneScreen() {
  const router = useRouter();
  const { c } = useDs();
  const { data } = useBaseline();
  const [finishLater, setFinishLater] = useState(false);
  const params = useLocalSearchParams<{ part: string }>();
  const n = Math.min(4, Math.max(1, parseInt(params.part ?? "1", 10))) as PartNumber;
  const part = partOf(n);
  const next = n < 4 ? partOf((n + 1) as PartNumber) : null;
  const questions = visibleQuestions(data, n);

  const goNext = () => {
    if (!next) {
      router.push("/(baseline)/score");
      return;
    }
    const first = visibleQuestions(data, next.n)[0];
    router.push({ pathname: "/(baseline)/question/[id]", params: { id: first.id } });
  };

  return (
    <>
      <DsScreen
        header={<SetupHeader part={n} partName={part.name} progress={1} fromProgress={0.85} onFinishLater={() => setFinishLater(true)} />}
        footer={
          <>
            <DsButton label={next ? `Continue to ${next.name}` : "See my starting score"} onPress={goNext} />
            <DsButton label="Take a break, finish later" variant="quiet" onPress={() => setFinishLater(true)} />
          </>
        }
      >
        <Animated.View
          entering={ZoomIn.delay(150).springify().damping(12)}
          style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: c.mint, alignItems: "center", justifyContent: "center", marginBottom: 20 }}
        >
          <Feather name="check" size={28} color={c.charcoal} />
        </Animated.View>
        <Text accessibilityRole="header" style={{ fontSize: 28, lineHeight: 35, fontWeight: "600", letterSpacing: -0.5, color: c.ink }}>
          {part.name}, done.
        </Text>
        <Text style={{ fontSize: 16, lineHeight: 24, color: c.slate, marginTop: 8, marginBottom: 22 }}>
          Here&apos;s what you told us. Tap Edit if anything looks off.
        </Text>

        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.hairline }}>
          {questions.map((q, i) => (
            <View
              key={q.id}
              className="flex-row items-center"
              style={{ paddingLeft: 16, paddingRight: 6, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.hairlineSoft }}
            >
              <View className="flex-1">
                <Text style={{ fontSize: 12, fontWeight: "500", color: c.steel }}>{SHORT_LABEL[q.id] ?? q.title}</Text>
                <Text style={{ fontSize: 15, fontWeight: "500", color: c.ink, marginTop: 2 }}>{answerText(q, data)}</Text>
              </View>
              <AnimatedButton
                onPress={() => router.push({ pathname: "/(baseline)/question/[id]", params: { id: q.id, from: "recap" } })}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${SHORT_LABEL[q.id] ?? q.title}`}
                style={{ height: 44, paddingHorizontal: 12, justifyContent: "center" }}
              >
                <Text style={{ fontSize: 14, fontWeight: "500", color: c.link }}>Edit</Text>
              </AnimatedButton>
            </View>
          ))}
        </View>

        {next ? (
          <View className="flex-row items-center" style={{ gap: 14, marginTop: 14, padding: 16, borderRadius: 12, backgroundColor: tintColor(c, next.tint) }}>
            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: c.canvas, alignItems: "center", justifyContent: "center" }}>
              <IconBadge icon={next.icon} tint={next.tint} size={32} />
            </View>
            <View className="flex-1">
              <Text style={{ fontSize: 12, fontWeight: "500", color: c.charcoal }}>
                {next.n === 4 ? "Last part" : "Next"} · about 1 minute
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "600", color: c.charcoal, marginTop: 2 }}>{next.name}</Text>
            </View>
          </View>
        ) : null}
      </DsScreen>
      <FinishLaterDialog visible={finishLater} onClose={() => setFinishLater(false)} />
    </>
  );
}
