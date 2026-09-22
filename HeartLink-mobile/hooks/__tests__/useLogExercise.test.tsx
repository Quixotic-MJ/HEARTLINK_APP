import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogExercise } from '../useLogExercise';
import * as ToastContext from '../../contexts/ToastContext';
import * as NetInfo from '@react-native-community/netinfo';
import * as SyncService from '../../services/SyncService';
import React from 'react';

// Mock dependencies
jest.mock('../../contexts/ToastContext');
jest.mock('@react-native-community/netinfo');
jest.mock('../../services/SyncService', () => ({
  queueExerciseForSync: jest.fn(),
}));

const mockShowToast = jest.fn();
(ToastContext.useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });

// Setup QueryClient
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

describe('useLogExercise', () => {
  let queryClient: QueryClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    (NetInfo.useNetInfo as jest.Mock).mockReturnValue({ isConnected: true, isInternetReachable: true });
    global.fetch = jest.fn();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  it('calculates running total and formats data-aware success toast', async () => {
    // Seed initial dashboard data
    queryClient.setQueryData(['dashboard', 'user-1'], {
      today_activity: {
        total_exercise_minutes: 15,
        exercises_count: 1
      }
    });

    // Mock successful fetch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    const { result } = renderHook(() => useLogExercise('user-1', 'token-123'), { wrapper });

    await act(async () => {
      result.current.mutate({
        routine_name: 'Cycling',
        duration_minutes: 20,
        duration_seconds: 1200,
        status: 'completed'
      });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify optimistic dashboard cache update (15 + 20 = 35)
    const dashboardData = queryClient.getQueryData(['dashboard', 'user-1']) as any;
    expect(dashboardData.today_activity.total_exercise_minutes).toBe(35);

    // Verify toast includes running total
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      title: 'Activity logged', // from postLogAck
      message: "Well done — Cycling — 20 min logged. You're at 35 min of activity today. I'm proud of that consistency; it matters."
    }));
  });

  it('prevents double-toasting on network error', async () => {
    // Simulate offline state
    (NetInfo.useNetInfo as jest.Mock).mockReturnValue({ isConnected: false, isInternetReachable: false });

    // Mock network failure
    (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed'));

    const { result } = renderHook(() => useLogExercise('user-1', 'token-123'), { wrapper });

    await act(async () => {
      result.current.mutate({
        routine_name: 'Walking',
        duration_minutes: 10,
        duration_seconds: 600,
        status: 'completed'
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // 1. Assert offline toast WAS shown by onMutate
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
      type: 'info',
      message: "Well done — Walking — 10 min saved offline. You're at 10 min of activity today. I'm proud of that consistency; it matters."
    }));

    // 2. Assert NO double-toasting fallback info toast was shown
    expect(mockShowToast).not.toHaveBeenCalledWith(expect.objectContaining({
      message: "Network unstable. Your activity was saved offline."
    }));

    // Verify it queued for offline sync
    expect(SyncService.queueExerciseForSync).toHaveBeenCalledWith('user-1', expect.any(Object));
  });
});
