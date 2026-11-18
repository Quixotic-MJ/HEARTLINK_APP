import React, { useState } from "react";
import { useRouter } from "expo-router";
import { ExerciseScreening } from "../../components/exercise/ExerciseScreening";
import SetupHeader from "../../components/onboarding/SetupHeader";
import FinishLaterDialog from "../../components/onboarding/FinishLaterDialog";
import { useBaseline } from "../../contexts/BaselineContext";

// HL-122: the PAR-Q+ comes right after the score questions, then the starting score is worked out. It decides which
// exercises are offered, never the score. 2026-11-18: it has setup's header again (back, the progress bar with all four
// parts full, Finish later), which it had lost.
export default function ExerciseCheckScreen() {
  const router = useRouter();
  const [finishLater, setFinishLater] = useState(false);
  const { data } = useBaseline();

  // From page 1, back returns to the setup questions (or the set-up map when the app reopened here)
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/(baseline)/plan"));

  return (
    <>
      <ExerciseScreening
        header={(back) => (
          <SetupHeader
            allPartsDone
            title="Before your score · Exercise safety check"
            onBack={back}
            onFinishLater={() => setFinishLater(true)}
          />
        )}
        onBack={leave}
        sex={data.sex}
        doneLabel="See my starting score"
        onDone={() => router.replace("/(baseline)/score")}
      />
      <FinishLaterDialog visible={finishLater} onClose={() => setFinishLater(false)} />
    </>
  );
}
