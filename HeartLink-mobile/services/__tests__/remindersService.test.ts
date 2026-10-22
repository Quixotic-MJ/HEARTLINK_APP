import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_REMINDERS, loadReminders, saveReminders, scheduleReminders } from '../remindersService';
import { scheduleDailyReminder, cancelReminder } from '../../utils/notifications';

jest.mock('../../lib/secureTokenStore', () => ({ getToken: jest.fn(async () => 'token-123') }));
jest.mock('../../utils/notifications', () => ({
  requestNotificationPermissions: jest.fn(async () => true),
  scheduleDailyReminder: jest.fn(),
  cancelReminder: jest.fn(),
}));

const ACCOUNT = {
  morning: { enabled: true, time: '07:30' },
  evening: { enabled: false, time: '20:00' },
  activity: { enabled: true, time: '17:00' },
};

beforeEach(async () => {
  await AsyncStorage.clear();
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ACCOUNT })) as jest.Mock;
});

describe('medicine reminder', () => {
  it('is off at 8:00 AM by default', () => {
    expect(DEFAULT_REMINDERS.medicine).toEqual({ enabled: false, time: '08:00' });
  });

  it('is kept on the phone, not sent to the account', async () => {
    await saveReminders('user-1', 'token-123', { ...ACCOUNT, medicine: { enabled: true, time: '09:15' } });

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual(ACCOUNT);
    expect(await loadReminders('user-1', 'token-123')).toEqual({ ...ACCOUNT, medicine: { enabled: true, time: '09:15' } });
  });

  it('loads as the default when it was never set', async () => {
    expect((await loadReminders('user-1', 'token-123'))?.medicine).toEqual(DEFAULT_REMINDERS.medicine);
  });

  it('is scheduled with the others when turned on, and cancelled when off', async () => {
    await scheduleReminders({ ...ACCOUNT, medicine: { enabled: true, time: '08:00' } });
    expect(scheduleDailyReminder).toHaveBeenCalledWith('medicine_reminder', 'Take your medicines', expect.any(String), '08:00');

    await scheduleReminders({ ...ACCOUNT, medicine: { enabled: false, time: '08:00' } });
    expect(cancelReminder).toHaveBeenCalledWith('medicine_reminder');
  });
});
