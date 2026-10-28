import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, onlineManager } from '@tanstack/react-query';
import { useLogVitals, wasQueued, medicationTaken, VitalsPayload } from '../useLogVitals';
import { queueHealthLogForSync } from '../../services/SyncService';
import { createTestQueryClient, queryClientWrapper } from '../../test-utils/reactQuery';

jest.mock('../../services/SyncService', () => ({
  queueHealthLogForSync: jest.fn(),
}));

const CHECK_IN: VitalsPayload = {
  systolic_bp: 128,
  diastolic_bp: 82,
  heart_rate_bpm: 70,
  weight_kg: null,
  medication_taken: null,
  symptoms: ['None (Feeling fine)'],
  severity_map: {},
  context: null,
  triggered_by_exercise_id: null,
  notes: '',
};

const BEFORE = {
  today_activity: { vitals_logged: false, meals_count: 2 },
  latest_vitals: { bp: '120/80', bpm: 66, trend: 'stable' },
};

function sentBody(): Record<string, unknown> {
  const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
  return JSON.parse(init.body as string);
}

describe('useLogVitals', () => {
  let queryClient: QueryClient;
  let wrapper: ReturnType<typeof queryClientWrapper>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    wrapper = queryClientWrapper(queryClient);
    queryClient.setQueryData(['dashboard', 'user-1'], BEFORE);
    global.fetch = jest.fn();
  });

  async function logCheckIn(payload: VitalsPayload = CHECK_IN) {
    const { result } = await renderHook(() => useLogVitals('user-1', 'token-123'), { wrapper });
    await act(async () => {
      result.current.mutate(payload);
    });
    return result;
  }

  it('saves online and shows the new reading on the dashboard', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) });

    const result = await logCheckIn();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect((global.fetch as jest.Mock).mock.calls[0][0]).toMatch(/\/api\/health-logs\/user-1$/);
    // "I don't take any" is sent as null, not false.
    expect(sentBody().medication_taken).toBeNull();
    const dashboard = queryClient.getQueryData(['dashboard', 'user-1']) as typeof BEFORE;
    expect(dashboard.today_activity).toEqual({ vitals_logged: true, meals_count: 2 });
    expect(dashboard.latest_vitals).toEqual({ bp: '128/82', bpm: 70, trend: 'stable' });
    expect(queueHealthLogForSync).not.toHaveBeenCalled();
  });

  it('saves the check-in on the phone when there is no connection', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed'));

    const result = await logCheckIn();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(wasQueued(result.current.error)).toBe(true);
    expect(queueHealthLogForSync).toHaveBeenCalledWith('user-1', CHECK_IN);
    // The dashboard keeps showing it while it waits to upload.
    const dashboard = queryClient.getQueryData(['dashboard', 'user-1']) as typeof BEFORE;
    expect(dashboard.latest_vitals.bp).toBe('128/82');
  });

  it("saves on the phone with Expo's own fetch error too (what a real phone gets offline)", async () => {
    // Expo replaces fetch; offline it fails with "fetch failed: ...", not React Native's TypeError
    (queueHealthLogForSync as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('fetch failed: Unable to resolve host "heartlink-staging.onrender.com"'));

    const result = await logCheckIn();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(wasQueued(result.current.error)).toBe(true);
    expect(queueHealthLogForSync).toHaveBeenCalledWith('user-1', CHECK_IN);
  });

  it('saves on the phone at once in airplane mode, without waiting or retrying (HL-076)', async () => {
    // Same mutation defaults as the app (lib/react-query.ts retries 3 times), while React Query thinks we're offline
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: 3, gcTime: Infinity } } });
    queryClient.setQueryData(['dashboard', 'user-1'], BEFORE);
    wrapper = queryClientWrapper(queryClient);
    (queueHealthLogForSync as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));
    onlineManager.setOnline(false);
    try {
      const result = await logCheckIn();
      // Before HL-076 the save was paused here until the connection came back, so Save kept spinning
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.isPaused).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(queueHealthLogForSync).toHaveBeenCalledTimes(1);
      expect(queueHealthLogForSync).toHaveBeenCalledWith('user-1', CHECK_IN);
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('also queues it when the server has a problem (5xx)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });

    const result = await logCheckIn();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(queueHealthLogForSync).toHaveBeenCalledWith('user-1', CHECK_IN);
  });

  it('puts the dashboard back when the server refuses the check-in', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({}) });

    const result = await logCheckIn();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(wasQueued(result.current.error)).toBe(false);
    expect(queueHealthLogForSync).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(['dashboard', 'user-1'])).toEqual(BEFORE);
  });
});

describe('medicationTaken', () => {
  it('saves "I don\'t take any" as null and the other answers as yes/no', () => {
    expect(medicationTaken('none')).toBeNull();
    expect(medicationTaken('taken')).toBe(true);
    expect(medicationTaken('not_yet')).toBe(false);
    // Left blank (the patient confirmed the incomplete check-in): not taken, as before.
    expect(medicationTaken(null)).toBe(false);
  });
});
