import React from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ExerciseScreening } from "../../../components/exercise/ExerciseScreening";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";
import { useProfileDetails } from "../../../hooks/useProfileDetails";

// HL-093 and HL-122: the safety check from Settings, or before a workout when it's needed.
export default function ExerciseScreeningScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  // Sex at birth from the profile: Male skips the pregnancy question (2026-11-18). Until it loads, the question shows.
  const { data: profile } = useProfileDetails();
  return (
    <ExerciseScreening
      header={
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        </View>
      }
      onDone={() => router.back()}
      reason={reason}
      sex={profile?.sex}
    />
  );
}
