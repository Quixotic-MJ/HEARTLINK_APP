import { Stack } from "expo-router";
import "../../global.css";

// Set-up flow. Questions are one screen (question/[id]) driven by constants/setupQuestions.ts.
export default function BaselineLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        // Screens behind the current one stop re-rendering, so a tap only redraws the screen in front.
        freezeOnBlur: true,
      }}
    >
      <Stack.Screen name="start" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="question/[id]" />
      <Stack.Screen name="part-done" />
      <Stack.Screen name="score" options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="first-reading" options={{ gestureEnabled: false }} />
      <Stack.Screen name="reminders" options={{ gestureEnabled: false }} />
      <Stack.Screen name="day-one" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
