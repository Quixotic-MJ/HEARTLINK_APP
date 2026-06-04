import { Stack } from "expo-router";
import "../../global.css";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom", // Premium native slide-in animation
      }}
    >
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
