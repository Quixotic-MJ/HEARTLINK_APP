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

describe('push status for Settings (HL-077)', () => {
  // The failures are logged on purpose (logAppError); keep the test output readable
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => (console.error as jest.Mock).mockRestore());

  it('says push is on once the phone is saved on the server', async () => {
    const { service } = load();
    expect(service.getPushStatus()).toBeNull();
    await service.registerForPush();
    expect(service.getPushStatus()).toEqual({ on: true });
    expect(service.pushStatusText(service.getPushStatus()).action).toBeNull();
  });

  it.each([
    [{ expoGo: true }, 'expo_go', null],
    [{ isDevice: false }, 'emulator', null],
    [{ projectId: null }, 'not_set_up', null],
    [{ permission: 'denied' }, 'permission', 'open_settings'],
    [{ serverOk: false }, 'server', 'retry'],
  ] as const)('remembers why push is off: %j', async (setup, reason, action) => {
    const { service } = load(setup);
    await service.registerForPush();
    expect(service.getPushStatus()).toEqual({ on: false, reason });
    expect(service.pushStatusText(service.getPushStatus()).action).toBe(action);
  });

  it('tells apart a failed Expo token from a failed save', async () => {
    const { service, notifications } = load();
    notifications.getExpoPushTokenAsync.mockRejectedValueOnce(new Error('FCM not set up'));
    await service.registerForPush();
    expect(service.getPushStatus()).toEqual({ on: false, reason: 'token' });
    expect(console.error).toHaveBeenCalled();
  });

  it('every reason has a plain message', () => {
    const { service } = load();
    for (const reason of ['expo_go', 'emulator', 'not_set_up', 'permission', 'token', 'server'] as const) {
      expect(service.pushStatusText({ on: false, reason }).subtitle).toMatch(/^Off/);
    }
    expect(service.pushStatusText(null).subtitle).toBe('Checking…');
  });
});

describe('notifications while the app is open (HL-077)', () => {
  it('shows a banner and keeps it in the list', async () => {
    const setNotificationHandler = jest.fn();
    jest.isolateModules(() => {
      jest.doMock('expo-constants', () => ({
        __esModule: true,
        default: { executionEnvironment: 'standalone' },
        ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone' },
      }));
      jest.doMock('expo-notifications', () => ({ setNotificationHandler }));
      require('../../utils/notifications');
    });
    const behaviour = await setNotificationHandler.mock.calls[0][0].handleNotification();
    expect(behaviour).toMatchObject({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true });
  });
});

