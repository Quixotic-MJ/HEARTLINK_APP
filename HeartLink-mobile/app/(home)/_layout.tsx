import { Stack } from "expo-router";
import "../../global.css";

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="profile"
        options={{
          animation: "slide_from_right",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          animation: "slide_from_right",
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          animation: "slide_from_right",
          presentation: "card",
        }}
      />
    </Stack>
  );
}
