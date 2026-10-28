import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Determine if we are running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;

if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    // Configure how notifications behave when the app is in the foreground
    Notifications.setNotificationHandler({
      // HL-077: shouldShowAlert alone no longer shows anything; these two show the banner and keep it in the list
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn("Failed to load expo-notifications");
  }
}

// Android shows a notification only through a channel; reminders and pushes share this one (push.py sends to it too)
const ANDROID_CHANNEL = 'default';

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

/**
 * Request user permission for notifications
 */
export async function requestNotificationPermissions() {
  if (isExpoGo || !Notifications) {
    if (__DEV__) {
      console.log("[Notifications] Running in Expo Go client environment.");
    }
    return true;
  }

  await ensureAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

/**
 * Schedule a daily recurring local notification
 */
export async function scheduleDailyReminder(
  identifier: string,
  title: string,
  body: string,
  timeStr: string
) {
  if (isExpoGo || !Notifications) {
    if (__DEV__) {
      console.log(`[Notifications] Reminder registered: ${identifier} at ${timeStr} ("${title}")`);
    }
    return;
  }

  // First cancel any existing notification with this identifier
  await cancelReminder(identifier);

  const [hours, minutes] = timeStr.split(':').map(Number);
  await ensureAndroidChannel();

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: true,
    },
    // Since expo-notifications 0.28 a trigger must say its type; the old { hour, minute, repeats } shape is refused
    // ("The `trigger` object you provided is invalid"), so no reminder was ever saved.
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
    },
  });
}

/**
 * Cancel a specific scheduled notification by its identifier
 */
export async function cancelReminder(identifier: string) {
  if (isExpoGo || !Notifications) {
    if (__DEV__) {
      console.log(`[Notifications] Reminder cancelled: ${identifier}`);
    }
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllReminders() {
  if (isExpoGo || !Notifications) {
    return;
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
}
