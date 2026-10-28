// Daily reminders are scheduled in the shape expo-notifications 57 accepts. The old { hour, minute, repeats } trigger
// was refused ("The `trigger` object you provided is invalid"), so turning reminders on always failed in the test build.

const mockSchedule = jest.fn(async (_request: { trigger: unknown }) => "id");
const mockChannel = jest.fn(async () => null);

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { executionEnvironment: "standalone" },
  ExecutionEnvironment: { StoreClient: "storeClient", Standalone: "standalone" },
}));
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: mockChannel,
  scheduleNotificationAsync: mockSchedule,
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  AndroidImportance: { MAX: 5 },
  SchedulableTriggerInputTypes: { DAILY: "daily" },
}));

describe("scheduleDailyReminder", () => {
  beforeEach(() => {
    mockSchedule.mockClear();
    mockChannel.mockClear();
  });

  function load(os: "android" | "ios") {
    jest.resetModules();
    jest.doMock("react-native", () => ({ Platform: { OS: os } }));
    return jest.requireActual<typeof import("../notifications")>("../notifications");
  }

  it("asks for a daily trigger on Android's notification channel", async () => {
    const { scheduleDailyReminder } = load("android");
    await scheduleDailyReminder("morning-bp", "Morning check-in", "Log your blood pressure", "07:30");
    expect(mockChannel).toHaveBeenCalledWith("default", expect.objectContaining({ name: "default" }));
    expect(mockSchedule).toHaveBeenCalledWith({
      identifier: "morning-bp",
      content: { title: "Morning check-in", body: "Log your blood pressure", sound: true },
      trigger: { type: "daily", hour: 7, minute: 30, channelId: "default" },
    });
  });

  it("leaves out the channel on iPhone", async () => {
    const { scheduleDailyReminder } = load("ios");
    await scheduleDailyReminder("evening-walk", "Evening walk", "A short walk", "18:05");
    expect(mockChannel).not.toHaveBeenCalled();
    expect(mockSchedule).toHaveBeenCalledWith(expect.objectContaining({ trigger: { type: "daily", hour: 18, minute: 5 } }));
  });
});
