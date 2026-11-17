/* global jest */ // Jest provides `jest` when it runs this file; tells the linter it exists.
import '@testing-library/jest-native/extend-expect';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Reanimated runs on react-native-worklets, whose native part doesn't exist in
// Jest. Use the official Worklets mock (recommended in the Worklets testing guide).
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/src/mock')
);

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));


// Like the real ones, these return a promise, so screens can write Haptics.selectionAsync().catch(...)
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  }
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Spoken exercise instructions and keeping the screen on are phone features with no Jest version.
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

// The workout tones (services/workoutSounds.ts): Jest has no audio player.
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({ play: jest.fn(), seekTo: jest.fn(() => Promise.resolve()), remove: jest.fn() })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
}));

// The YouTube player is a web view, which doesn't exist in Jest.
jest.mock('react-native-youtube-iframe', () => () => null);

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
  useKeepAwake: jest.fn(),
}));
