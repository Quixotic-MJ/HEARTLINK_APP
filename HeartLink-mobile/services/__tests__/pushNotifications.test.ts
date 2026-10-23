// HL-025: the phone's push token is saved after sign-in and removed on sign-out; Expo Go is skipped.
import { Platform } from 'react-native';

const TOKEN = 'ExponentPushToken[abc123]';

type Setup = { expoGo?: boolean; isDevice?: boolean; projectId?: string | null; permission?: string; serverOk?: boolean };

function load({ expoGo = false, isDevice = true, projectId = 'proj-1', permission = 'granted', serverOk = true }: Setup = {}) {
  const apiFetch = jest.fn(async () => ({ ok: serverOk }));
  const notifications = {
    setNotificationChannelAsync: jest.fn(async () => undefined),
    getPermissionsAsync: jest.fn(async () => ({ status: permission })),
    requestPermissionsAsync: jest.fn(async () => ({ status: permission })),
    getExpoPushTokenAsync: jest.fn(async () => ({ data: TOKEN })),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    AndroidImportance: { MAX: 5 },
  };
  let service!: typeof import('../pushNotifications');
  jest.isolateModules(() => {
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        executionEnvironment: expoGo ? 'storeClient' : 'standalone',
        expoConfig: { extra: { eas: { projectId: projectId ?? undefined } } },
        easConfig: undefined,
      },
      ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone' },
    }));
    jest.doMock('expo-device', () => ({ isDevice }));
    jest.doMock('expo-notifications', () => notifications);
    jest.doMock('../../lib/api', () => ({ apiFetch }));
    service = require('../pushNotifications');
  });
  return { service, apiFetch, notifications };
}

afterEach(() => {
  jest.resetModules();
});

describe('registerForPush', () => {
  it('saves the token on the server after sign-in', async () => {
    const { service, apiFetch, notifications } = load();
    await expect(service.registerForPush()).resolves.toBe(TOKEN);
    expect(notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-1' });
    expect(apiFetch).toHaveBeenCalledWith('/api/notifications/push-token', {
      method: 'POST',
      // jest-expo runs as iOS by default; the app sends whichever platform it is on
      body: JSON.stringify({ token: TOKEN, platform: Platform.OS === 'ios' ? 'ios' : 'android' }),
    });
  });

  it('does nothing in Expo Go, on an emulator, or before the EAS project is set up', async () => {
    for (const setup of [{ expoGo: true }, { isDevice: false }, { projectId: null }]) {
      const { service, apiFetch } = load(setup);
      await expect(service.registerForPush()).resolves.toBeNull();
      expect(apiFetch).not.toHaveBeenCalled();
    }
  });

  it('respects a "no" to notifications', async () => {
    const { service, apiFetch } = load({ permission: 'denied' });
    await expect(service.registerForPush()).resolves.toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('never throws, so sign-in carries on', async () => {
    const { service, notifications } = load();
    notifications.getExpoPushTokenAsync.mockRejectedValueOnce(new Error('no network'));
    await expect(service.registerForPush()).resolves.toBeNull();
  });
});

describe('unregisterPush', () => {
  it('removes the saved token on sign-out, once', async () => {
    const { service, apiFetch } = load();
    await service.registerForPush();
    apiFetch.mockClear();

    await service.unregisterPush();
    expect(apiFetch).toHaveBeenCalledWith('/api/notifications/push-token', {
      method: 'DELETE',
      body: JSON.stringify({ token: TOKEN }),
    });

    apiFetch.mockClear();
    await service.unregisterPush();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('does nothing when no token was saved, and swallows errors', async () => {
    const { service, apiFetch } = load({ serverOk: false });
    await service.registerForPush(); // server refused, so nothing is remembered
    await service.unregisterPush();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
});
