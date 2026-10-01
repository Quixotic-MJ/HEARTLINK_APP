const React = require('react');
const ReactQuery = require('@tanstack/react-query');

// --- 1. MOCK THE GLOBALS AND DEPENDENCIES ---
let capturedMutationConfig = null;

// Mock React Query
jest = undefined; // We are not in jest
const mockUseMutation = (config) => {
  capturedMutationConfig = config;
  return {};
};
const mockCancelQueries = async () => {};
const mockSetQueryData = (key, updater) => {
    if (typeof updater === 'function') {
        const result = updater(mockCacheData);
        mockCacheData = result;
    } else {
        mockCacheData = updater;
    }
};
const mockGetQueryData = () => mockCacheData;
const mockInvalidateQueries = () => {};

const mockUseQueryClient = () => ({
  cancelQueries: mockCancelQueries,
  setQueryData: mockSetQueryData,
  getQueryData: mockGetQueryData,
  invalidateQueries: mockInvalidateQueries,
});

// We have to intercept module loading since this is plain Node.
// Node's require cache manipulation:
const Module = require('module');
const originalRequire = Module.prototype.require;

let mockCacheData = null;
let mockIsOffline = false;
const mockShowToast = (toastParams) => {
  console.log(`[TOAST FIRED] type: ${toastParams.type} | msg: "${toastParams.message}"`);
};

Module.prototype.require = function(id) {
  if (id === '@tanstack/react-query') {
    return { ...ReactQuery, useMutation: mockUseMutation, useQueryClient: mockUseQueryClient };
  }
  if (id.includes('ToastContext')) {
    return { useToast: () => ({ showToast: mockShowToast }) };
  }
  if (id === '@react-native-community/netinfo') {
    return { useNetInfo: () => ({ isConnected: !mockIsOffline, isInternetReachable: !mockIsOffline }) };
  }
  if (id.includes('SyncService')) {
    return { queueExerciseForSync: () => { console.log("[SYNC] queueExerciseForSync called"); } };
  }
  return originalRequire.apply(this, arguments);
};

// --- 2. IMPORT AND RUN THE HOOK ---
// Import the compiled JS or use TS. Since it's TS, we'll use tsx to run this file.
const { useLogExercise } = require('./hooks/useLogExercise');

async function runTest() {
  console.log("==========================================");
  console.log("TEST 1: Data-aware toast and running total");
  console.log("==========================================");
  
  // Setup initial cache
  mockCacheData = {
    today_activity: { total_exercise_minutes: 15, exercises_count: 1 }
  };
  mockIsOffline = false;

  // Render hook
  useLogExercise('user-1', 'token-123');

  // Trigger onMutate with 20 minutes (15 + 20 = 35 expected)
  const context = await capturedMutationConfig.onMutate({
    routine_name: 'Cycling',
    duration_minutes: 20
  });

  console.log(`[ASSERT] Dashboard cache updated? ${mockCacheData.today_activity.total_exercise_minutes === 35 ? '✅ YES (35 min)' : '❌ NO'}`);
  console.log(`[ASSERT] Context returned offlineToastShown as false? ${context.offlineToastShown === false ? '✅ YES' : '❌ NO'}`);
  
  console.log("\n==========================================");
  console.log("TEST 2: Offline double-toast prevention");
  console.log("==========================================");
  
  // Setup offline state
  mockIsOffline = true;
  mockCacheData = null; // reset
  
  useLogExercise('user-1', 'token-123');
  
  // 1. Trigger optimistic update (this should fire the OFFLINE info toast)
  console.log("--- Firing onMutate (optimistic) ---");
  const offlineContext = await capturedMutationConfig.onMutate({
    routine_name: 'Walking',
    duration_minutes: 10
  });

  // 2. Trigger error (network failure)
  console.log("\n--- Firing onError (network fail) ---");
  const networkError = new Error('Network fail');
  networkError.isNetworkError = true;
  
  capturedMutationConfig.onError(networkError, {}, offlineContext);
  
  console.log("\nTest run complete.");
}

runTest().catch(console.error);
