import React from "react";
import { useRouter } from "expo-router";
import { ExerciseScreening } from "../../components/exercise/ExerciseScreening";

// HL-122: the PAR-Q+ comes right after the score questions, then the starting score is worked out. It decides which
// exercises are offered, never the score.
export default function ExerciseCheckScreen() {
  const router = useRouter();
  return <ExerciseScreening doneLabel="See my starting score" onDone={() => router.replace("/(baseline)/score")} />;
}
