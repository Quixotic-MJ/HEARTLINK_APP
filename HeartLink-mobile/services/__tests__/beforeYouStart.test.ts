import AsyncStorage from "@react-native-async-storage/async-storage";
import { checkedBefore, rememberChecked } from "../beforeYouStart";

describe("Before you start: remembering which exercises were checked", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("is not checked until the full list was ticked, then it is, per account", async () => {
    expect(await checkedBefore("user-1", "walk")).toBe(false);
    await rememberChecked("user-1", "walk");
    await rememberChecked("user-1", "walk");
    expect(await checkedBefore("user-1", "walk")).toBe(true);
    expect(await checkedBefore("user-1", "squats")).toBe(false);
    expect(await checkedBefore("user-2", "walk")).toBe(false);
    expect(JSON.parse((await AsyncStorage.getItem("@before_you_start_done_user-1")) ?? "[]")).toEqual(["walk"]);
  });

  it("treats an unreadable saved list as nothing checked", async () => {
    await AsyncStorage.setItem("@before_you_start_done_user-1", "not json");
    expect(await checkedBefore("user-1", "walk")).toBe(false);
  });
});
