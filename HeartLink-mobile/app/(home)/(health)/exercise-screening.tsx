import React from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { ExerciseScreening } from "../../../components/exercise/ExerciseScreening";
import { SquareIconButton } from "../../../components/exercise/ExerciseBits";

// HL-093: the safety check from Settings, or before the first workout.
export default function ExerciseScreeningScreen() {
  const router = useRouter();
  return (
    <ExerciseScreening
      header={
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <SquareIconButton icon="arrow-left" label="Go back" onPress={() => router.back()} />
        </View>
      }
      onDone={() => router.back()}
    />
  );
}
