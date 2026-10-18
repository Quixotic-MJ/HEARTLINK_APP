import { act, renderHook } from "@testing-library/react-native";
import * as Speech from "expo-speech";
import { useVoiceGuide } from "../useVoiceGuide";

const speak = Speech.speak as jest.Mock;
const stop = Speech.stop as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Voice guide", () => {
  it("lets instructions cut in, but extras wait until the voice is free", async () => {
    const { result } = await renderHook(() => useVoiceGuide());

    await act(async () => result.current.say("Lift one leg straight out. 10 times on each side"));
    expect(speak).toHaveBeenCalledTimes(1);

    // Still speaking: counting is skipped instead of cutting the instruction off.
    await act(async () => result.current.sayIfQuiet("2"));
    expect(speak).toHaveBeenCalledTimes(1);

    // The instruction finishes; now counting is heard.
    const finished = speak.mock.calls[0][1].onDone;
    await act(async () => finished());
    await act(async () => result.current.sayIfQuiet("3"));
    expect(speak).toHaveBeenLastCalledWith("3", expect.objectContaining({ rate: 0.9 }));

    // A new instruction always cuts in.
    await act(async () => result.current.say("Now the other side"));
    expect(stop).toHaveBeenCalled();
    expect(speak).toHaveBeenLastCalledWith("Now the other side", expect.anything());
  });

  it("ignores a late 'finished' from speech that was cut off", async () => {
    const { result } = await renderHook(() => useVoiceGuide());
    await act(async () => result.current.say("First"));
    await act(async () => result.current.say("Second"));
    // The first one reports it stopped after the second has started: the voice is still busy.
    const firstStopped = speak.mock.calls[0][1].onStopped;
    await act(async () => firstStopped());
    await act(async () => result.current.sayIfQuiet("3"));
    expect(speak).toHaveBeenCalledTimes(2);
  });
});
