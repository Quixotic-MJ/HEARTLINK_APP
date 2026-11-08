import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ExerciseScreening } from "../../components/exercise/ExerciseScreening";

// HL-093: the safety check during setup. "Answer later" is fine: it's asked again before the first workout.
export default function ExerciseCheckScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name?: string }>();
  const next = () => router.replace({ pathname: "/(baseline)/reminders", params: { name: name ?? "" } });
  return <ExerciseScreening doneLabel="Continue" onDone={next} onSkip={next} />;
}
