import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_REMINDERS,
  bedtimeReminderFor,
  loadReminders,
  saveReminders,
  scheduleReminders,
  usualBedtime,
} from '../remindersService';
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
// The reminders kept on the phone, at their defaults
const PHONE = { medicine: DEFAULT_REMINDERS.medicine, bedtime: DEFAULT_REMINDERS.bedtime };

beforeEach(async () => {
  await AsyncStorage.clear();
  global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ACCOUNT })) as jest.Mock;
});

describe('medicine reminder', () => {
  it('is off at 8:00 AM by default', () => {
    expect(DEFAULT_REMINDERS.medicine).toEqual({ enabled: false, time: '08:00' });
  });

  it('is kept on the phone, not sent to the account', async () => {
    await saveReminders('user-1', 'token-123', { ...ACCOUNT, ...PHONE, medicine: { enabled: true, time: '09:15' } });

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual(ACCOUNT);
    expect(await loadReminders('user-1', 'token-123')).toEqual({ ...ACCOUNT, ...PHONE, medicine: { enabled: true, time: '09:15' } });
  });

  it('loads as the default when it was never set', async () => {
    expect((await loadReminders('user-1', 'token-123'))?.medicine).toEqual(DEFAULT_REMINDERS.medicine);
  });

  it('is scheduled with the others when turned on, and cancelled when off', async () => {
    await scheduleReminders({ ...ACCOUNT, ...PHONE, medicine: { enabled: true, time: '08:00' } });
    expect(scheduleDailyReminder).toHaveBeenCalledWith('medicine_reminder', 'Take your medicines', expect.any(String), '08:00');

    await scheduleReminders({ ...ACCOUNT, ...PHONE, medicine: { enabled: false, time: '08:00' } });
    expect(cancelReminder).toHaveBeenCalledWith('medicine_reminder');
  });
});

// HL-161: a reminder to get ready for bed
describe('bedtime reminder', () => {
  it('is off at 10:00 PM by default', () => {
    expect(DEFAULT_REMINDERS.bedtime).toEqual({ enabled: false, time: '22:00' });
  });

  it('is kept on the phone, not sent to the account', async () => {
    await saveReminders('user-1', 'token-123', { ...ACCOUNT, ...PHONE, bedtime: { enabled: true, time: '22:45' } });

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual(ACCOUNT);
    expect((await loadReminders('user-1', 'token-123'))?.bedtime).toEqual({ enabled: true, time: '22:45' });
  });

  it('is scheduled when turned on, and cancelled when off', async () => {
    await scheduleReminders({ ...ACCOUNT, ...PHONE, bedtime: { enabled: true, time: '22:30' } });
    expect(scheduleDailyReminder).toHaveBeenCalledWith('bedtime_reminder', 'Time to wind down', expect.stringMatching(/7 to 9 hours/), '22:30');

    await scheduleReminders({ ...ACCOUNT, ...PHONE, bedtime: { enabled: false, time: '22:30' } });
    expect(cancelReminder).toHaveBeenCalledWith('bedtime_reminder');
  });
});

describe('bedtime suggestion from sleep logs', () => {
  // Local times, as the phone sees them
  const at = (h: number, m = 0, day = 10) => new Date(2026, 10, day, h, m).toISOString();

  it('needs at least 3 nights', () => {
    expect(usualBedtime([at(23), at(23)])).toBeNull();
    expect(usualBedtime([])).toBeNull();
  });

  it('averages bedtimes across midnight, rounded to 15 minutes', () => {
    expect(usualBedtime([at(23), at(1, 0, 11), at(0)])).toBe('00:00');
    expect(usualBedtime([at(22, 40), at(23, 10), at(22, 55)])).toBe('23:00');
  });

  it('ignores empty or bad values and uses the latest nights only', () => {
    expect(usualBedtime([null, 'not a date', at(21), at(21), at(21), at(3), at(3)], 3)).toBe('21:00');
  });

  it('suggests the reminder 30 minutes before the usual bedtime', () => {
    expect(bedtimeReminderFor('23:00')).toBe('22:30');
    expect(bedtimeReminderFor('00:15')).toBe('23:45');
  });
});
