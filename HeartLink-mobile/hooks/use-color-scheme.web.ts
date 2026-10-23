import { useSyncExternalStore } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

const noSubscription = () => () => {};

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web.
 * The server render (and the first client render, while hydrating) uses 'light'; the client then switches.
 */
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const colorScheme = useRNColorScheme();

  if (hasHydrated) {
    return colorScheme;
  }

  return 'light';
}
