import { useColorScheme } from "nativewind";
import { ds, DsColors } from "../../constants/theme";

/** Design-system colours for the current theme (for inline, animated and SVG styles). */
export function useDs(): { c: DsColors; isDark: boolean } {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  return { c: isDark ? ds.dark : ds.light, isDark };
}
