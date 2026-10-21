import { useCallback, useRef } from "react";
import { useFocusEffect } from "expo-router";

/**
 * Re-checks the server each time the screen comes back into view. Tabs stay open in the
 * background, so without this a list keeps what it loaded first, e.g. a recipe a Dietitian
 * approves later (HL-037) wouldn't show until the app restarts. The first focus is skipped,
 * because the screen's query has just loaded.
 */
export function useRefetchOnFocus(refetch: () => unknown) {
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refetch();
    }, [refetch])
  );
}
