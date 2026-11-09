import { useColorScheme as useNativewindColorScheme } from "nativewind";
import { DARK_MODE_ENABLED } from "../constants/theme";

/**
 * NativeWind's colour scheme, but always light while dark mode is switched off (DARK_MODE_ENABLED in
 * constants/theme.ts). The app is set to light in app.json, yet in Expo Go the phone's dark mode still reaches
 * NativeWind's hook while the page colours stay light, which mixed dark cards with a light page. Screens read the
 * scheme through this hook so they all agree. The root layout keeps NativeWind's own hook, since it applies the setting.
 */
export function useColorScheme() {
  const scheme = useNativewindColorScheme();
  return DARK_MODE_ENABLED ? scheme : { ...scheme, colorScheme: "light" as const };
}
