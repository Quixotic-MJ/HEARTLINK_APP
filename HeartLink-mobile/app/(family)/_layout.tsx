import { Stack } from "expo-router";

// HL-087: the follower's side of family sharing. The home screen of a family-only account (no health setup), and
// reachable from Settings › Follow a family member for everyone else.
export default function FamilyLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
