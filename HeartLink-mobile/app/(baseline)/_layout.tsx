import { Stack } from "expo-router";
import "../../global.css";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right", // Premium native slide-in animation
      }}
    >
      <Stack.Screen name="core_biometrics" />
      <Stack.Screen name="lifestyle_habits" />
      <Stack.Screen name="dietary_profile" />
      <Stack.Screen name="clinical_biometrics" />
    </Stack>
  );
}
