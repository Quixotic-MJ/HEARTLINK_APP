import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from './UserContext';

export type BaselineData = {
  // Part 1: About you
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: 'male' | 'female' | '';
  height_cm: string;
  weight_kg: string;

  // Part 2: Movement
  vigorous_activity: boolean;
  vigorous_days?: string;
  vigorous_minutes?: string;
  moderate_activity: boolean;
  moderate_days?: string;
  moderate_minutes?: string;
  walk_bike_transport: boolean;
  walk_bike_days?: string;
  walk_bike_minutes?: string;
  sedentary_hours: string;

  // Part 3: Habits
  sleep_hours: string;
  ever_smoked: boolean;
  smoke_now?: string;
  ever_drank: boolean;
  drink_frequency?: string;
  drinks_per_occasion?: string;
  binge_drinking_freq?: string;

  // Part 4: Food & goals
  diet_level: string;
  fried_food_freq: string;
  salty_food_freq: string;
  fruit_veg_servings: string;
  health_goals: string[];
  allergies: string[];
  dietary_practice: string;

  // Yes/No questions default to false, so this records which ones were actually answered.
  answered: Partial<Record<'vigorous_activity' | 'moderate_activity' | 'walk_bike_transport' | 'ever_smoked' | 'ever_drank', boolean>>;
};

const defaultData: BaselineData = {
  first_name: '', last_name: '', date_of_birth: '', sex: '', height_cm: '', weight_kg: '',
  vigorous_activity: false, moderate_activity: false, walk_bike_transport: false, sedentary_hours: '',
  sleep_hours: '', ever_smoked: false,
  ever_drank: false,
  diet_level: '', fried_food_freq: '', salty_food_freq: '', fruit_veg_servings: '',
  health_goals: [], allergies: [], dietary_practice: '',
  answered: {},
};

interface BaselineContextType {
  data: BaselineData;
  /** True once saved answers (if any) have been loaded for the signed-in user. */
  loaded: boolean;
  updateData: (updates: Partial<BaselineData>) => void;
  resetData: () => void;
}

const BaselineContext = createContext<BaselineContextType | undefined>(undefined);

// Answers are kept on the phone per user, so "Finish later" picks up where they left off.
const draftKey = (userId: string) => `@heartlink_setup_draft_${userId}`;

export function BaselineProvider({ children }: { children: ReactNode }) {
  const { userId } = useUser();
  // The answers, tagged with the user they belong to, so a different login never sees them.
  const [store, setStore] = useState<{ user: string | null; data: BaselineData }>({ user: null, data: defaultData });
  const userRef = useRef<string | null>(null);

  useEffect(() => {
    userRef.current = userId;
    if (!userId) return;
    let active = true;
    AsyncStorage.getItem(draftKey(userId))
      .then((raw) => {
        if (!active) return;
        const saved = raw ? (JSON.parse(raw) as Partial<BaselineData>) : {};
        setStore({ user: userId, data: { ...defaultData, ...saved, answered: { ...(saved.answered ?? {}) } } });
      })
      .catch(() => {
        if (active) setStore({ user: userId, data: defaultData });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const loaded = !userId || store.user === userId;
  const data = userId && store.user === userId ? store.data : defaultData;

  const updateData = useCallback((updates: Partial<BaselineData>) => {
    setStore((prev) => {
      const id = userRef.current;
      const base = prev.user === id ? prev.data : defaultData;
      const next = { ...base, ...updates };
      if (id) AsyncStorage.setItem(draftKey(id), JSON.stringify(next)).catch(() => {});
      return { user: id, data: next };
    });
  }, []);

  const resetData = useCallback(() => {
    const id = userRef.current;
    setStore({ user: id, data: defaultData });
    if (id) AsyncStorage.removeItem(draftKey(id)).catch(() => {});
  }, []);

  return (
    <BaselineContext.Provider value={{ data, loaded, updateData, resetData }}>
      {children}
    </BaselineContext.Provider>
  );
}

export function useBaseline() {
  const context = useContext(BaselineContext);
  if (context === undefined) {
    throw new Error('useBaseline must be used within a BaselineProvider');
  }
  return context;
}
