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
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn("Failed to load expo-notifications");
  }
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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

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

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: true,
    },
    trigger: {
      hour: hours,
      minute: minutes,
      repeats: true,
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
