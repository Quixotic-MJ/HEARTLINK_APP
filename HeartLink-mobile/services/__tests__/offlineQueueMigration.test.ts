import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateOldOfflineQueue, syncOfflineAll } from '../SyncService';
import { getToken, getUserId } from '../../lib/secureTokenStore';

jest.mock('../../lib/secureTokenStore', () => ({
  getToken: jest.fn(),
  getUserId: jest.fn(),
}));

const CHECK_IN = { systolic_bp: 130, diastolic_bp: 85, medication_taken: false, symptoms: [] };

// What the old queue (utils/OfflineSyncService) saved for a check-in made offline.
function oldItem(url: string, body: unknown, timestamp = 1000) {
  return { id: `${timestamp}-x`, url, method: 'POST', body: JSON.stringify(body), timestamp, retryCount: 1, userId: 'user-1' };
}

async function stored(key: string) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  (getToken as jest.Mock).mockResolvedValue('token-123');
  (getUserId as jest.Mock).mockResolvedValue('user-1');
  global.fetch = jest.fn();
});

describe('moving the old offline queue into SyncService', () => {
  it('moves waiting check-ins into the health log queue and deletes the old queue', async () => {
    await AsyncStorage.setItem('@offline_health_queue_user-1', JSON.stringify([{ userId: 'user-1', payload: { systolic_bp: 120 }, timestamp: 5000 }]));
    await AsyncStorage.setItem('@offline_request_queue_user-1', JSON.stringify([
      oldItem('https://api.example.com/api/health-logs/user-1', CHECK_IN, 1000),
      oldItem('https://api.example.com/api/something-else', { a: 1 }),
    ]));
    await AsyncStorage.setItem('@offline_request_queue', JSON.stringify([oldItem('https://api.example.com/api/health-logs/user-2', CHECK_IN, 2000)]));

    expect(await migrateOldOfflineQueue()).toBe(2);

    // Older check-ins go first, ahead of what was already waiting.
    expect(await stored('@offline_health_queue_user-1')).toEqual([
      { userId: 'user-1', payload: CHECK_IN, timestamp: 1000 },
      { userId: 'user-1', payload: { systolic_bp: 120 }, timestamp: 5000 },
    ]);
    expect(await stored('@offline_health_queue_user-2')).toEqual([{ userId: 'user-2', payload: CHECK_IN, timestamp: 2000 }]);
    expect(await stored('@offline_request_queue_user-1')).toBeNull();
    expect(await stored('@offline_request_queue')).toBeNull();
  });

  it('does nothing when there is no old queue', async () => {
    expect(await migrateOldOfflineQueue()).toBe(0);
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('uploads a moved check-in on the next sync', async () => {
    await AsyncStorage.setItem('@offline_request_queue_user-1', JSON.stringify([
      oldItem('https://api.example.com/api/health-logs/user-1', { ...CHECK_IN, medication_taken: null }),
    ]));
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });

    await syncOfflineAll('');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/api\/health-logs\/user-1$/);
    expect(JSON.parse(init.body)).toEqual({ ...CHECK_IN, medication_taken: null });
    expect(await stored('@offline_health_queue_user-1')).toEqual([]);
    expect(await stored('@offline_request_queue_user-1')).toBeNull();
  });
});
