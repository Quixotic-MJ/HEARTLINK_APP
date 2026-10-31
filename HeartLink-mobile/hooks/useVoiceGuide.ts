import { useCallback, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import { playSound, type Cue } from "../services/sounds";

// Spoken instructions during an exercise, in the phone's own voice, so patients can follow along
// without looking at the screen. A little slower than normal speech. The mute choice is remembered.
//
// Two ways to speak: `say` is for instructions and cuts off whatever is being said; `sayIfQuiet`
// is for small extras (counting, "one minute left") and is skipped while the voice is busy, so it
// never cuts an instruction short.

const MUTE_KEY = "@exercise_voice_muted";
const VOICE = { language: "en", rate: 0.9 };

export type VoiceGuide = {
  /** Say this now, cutting off anything still being said. */
  say: (text: string) => void;
  /** Say this only if nothing is being said right now. */
  sayIfQuiet: (text: string) => void;
  stop: () => void;
  /** Play a short tone (countdown beep, new part, finished); silent while muted, like the voice. */
  cue: (sound: Cue) => void;
  muted: boolean;
  toggleMute: () => void;
};

export function useVoiceGuide(): VoiceGuide {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  // Which utterance is current, and whether it's still being spoken. Each new one gets a new
  // number, so a late "finished" from one that was cut off can't mark the voice as free.
  const current = useRef(0);
  const speaking = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(MUTE_KEY)
      .then((v) => {
        mutedRef.current = v === "1";
        setMuted(v === "1");
      })
      .catch(() => {});
    return () => {
      Speech.stop();
    };
  }, []);

  const speak = useCallback((words: string) => {
    const id = ++current.current;
    const done = () => {
      if (current.current === id) speaking.current = false;
    };
    speaking.current = true;
    Speech.speak(words, { ...VOICE, onDone: done, onStopped: done, onError: done });
  }, []);

  const say = useCallback(
    (text: string) => {
      const words = text.trim();
      if (mutedRef.current || !words) return;
      Speech.stop();
      speak(words);
    },
    [speak],
  );

  const sayIfQuiet = useCallback(
    (text: string) => {
      const words = text.trim();
      if (mutedRef.current || !words || speaking.current) return;
      speak(words);
    },
    [speak],
  );

  const stop = useCallback(() => {
    Speech.stop();
    speaking.current = false;
  }, []);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (next) {
      Speech.stop();
      speaking.current = false;
    } else speak("Voice on");
    AsyncStorage.setItem(MUTE_KEY, next ? "1" : "0").catch(() => {});
  }, [speak]);

  const cue = useCallback((sound: Cue) => {
    if (!mutedRef.current) playSound(sound);
  }, []);

  return { say, sayIfQuiet, stop, cue, muted, toggleMute };
}
