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
    console.log("Mocking notification permissions (Running in Expo Go)");
    return true; // Pretend we have permission in Expo Go
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
    console.log(`[Expo Go Mock] Scheduled ${identifier} at ${timeStr}: ${title}`);
    
    // Simulate notification in Expo Go with an Alert since native notifications are blocked
    setTimeout(() => {
      import('react-native').then(({ Alert }) => {
        Alert.alert(`🔔 ${title}`, `${body}\n\n(This is a simulated notification in Expo Go. On a real build, this would be a native push notification.)`);
      });
    }, 3000); // Trigger after 3 seconds so the user sees it
    
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
    console.log(`[Expo Go Mock] Cancelled ${identifier}`);
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
