import { Stack } from "expo-router";
import "../../global.css";

export default function BaselineLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right", // Premium native slide-in animation
      }}
    >
      <Stack.Screen name="step1_basic_info" />
      <Stack.Screen name="step2_activity" />
      <Stack.Screen name="step3_sleep_smoking" />
      <Stack.Screen name="step4_alcohol" />
      <Stack.Screen name="step5_diet" />
      <Stack.Screen name="step6_health" />
      <Stack.Screen name="calculating" options={{ animation: "fade" }} />
    </Stack>
  );
}
