import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

/**
 * The app's short sounds, all in assets/sounds:
 * - the guided exercise's tones, made for HeartLink: a beep for each second of the 3-2-1 countdown,
 *   a higher "go" when the timer starts, a chime when a new part begins and a tune when it's saved
 * - "press" when a check-in tile on the dashboard is tapped
 * - "notify" with the green "saved" messages (ToastContext)
 * - "score" when the heart ring fills with a score the patient hasn't heard yet (dashboard)
 *
 * They play alongside the spoken guidance, stay quiet when the phone is on silent, and can all be
 * turned off in Settings › Sounds. The workout's mute button also silences its tones (useVoiceGuide).
 */
export type Cue = "beep" | "go" | "chime" | "done" | "press" | "notify" | "score";

const SOURCES: Record<Cue, number> = {
  beep: require("../assets/sounds/beep.wav"),
  go: require("../assets/sounds/go.wav"),
  chime: require("../assets/sounds/chime.wav"),
  done: require("../assets/sounds/done.wav"),
  press: require("../assets/sounds/press.mp3"),
  notify: require("../assets/sounds/notify.mp3"),
  score: require("../assets/sounds/score.mp3"),
};

const SOUNDS_KEY = "@app_sounds_on";
let soundsOn = true;
AsyncStorage.getItem(SOUNDS_KEY)
  .then((v) => {
    soundsOn = v !== "0";
  })
  .catch(() => {});

export function soundsEnabled(): boolean {
  return soundsOn;
}

/** Settings › Sounds: whether the app plays any sounds, remembered on the phone. */
export function useSoundsSetting(): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState(soundsOn);
  const change = (next: boolean) => {
    soundsOn = next;
    setOn(next);
    AsyncStorage.setItem(SOUNDS_KEY, next ? "1" : "0").catch(() => {});
  };
  return [on, change];
}

const players: Partial<Record<Cue, AudioPlayer>> = {};
let modeSet = false;

export function playSound(cue: Cue): void {
  if (!soundsOn) return;
  // A sound must never stop or slow down what the patient is doing, so any audio error is ignored.
  try {
    if (!modeSet) {
      modeSet = true;
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: "mixWithOthers" }).catch(() => {});
    }
    let player = players[cue];
    if (!player) {
      player = createAudioPlayer(SOURCES[cue]);
      players[cue] = player;
    }
    const p = player;
    p.seekTo(0)
      .catch(() => {})
      .finally(() => p.play());
  } catch {
    // ignored on purpose (see above)
  }
}
