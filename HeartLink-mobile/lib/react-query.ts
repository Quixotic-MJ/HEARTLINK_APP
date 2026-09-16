import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { AppState, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';

// 1. Setup onlineManager to listen to network state changes
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected && state.isInternetReachable !== false);
  });
});

// 2. Setup focusManager to refetch on app focus
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });
  return () => {
    subscription.remove();
  };
});

// 3. Create the QueryClient with sensible defaults for a mobile app
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // Cache is kept around for 24 hours (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: Platform.OS === 'web', // typically handled by focusManager in RN
    },
    mutations: {
      retry: 3, // Retry failed mutations
    }
  },
});

// 4. Create the persister to save cache to AsyncStorage
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
});
