import React from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ExerciseScreening } from "../../../components/exercise/ExerciseScreening";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";

// HL-093 and HL-122: the safety check from Settings, or before a workout when it's needed.
export default function ExerciseScreeningScreen() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  return (
    <ExerciseScreening
      header={
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        </View>
      }
      onDone={() => router.back()}
      reason={reason}
    />
  );
}
