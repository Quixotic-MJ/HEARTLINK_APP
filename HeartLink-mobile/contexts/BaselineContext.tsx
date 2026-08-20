import React, { createContext, useContext, useState, ReactNode } from 'react';

export type BaselineData = {
  // Step 1: Basic
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: 'male' | 'female' | '';
  height_cm: string;
  weight_kg: string;
  
  // Step 2: Activity
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
  
  // Step 3: Sleep/Smoking
  sleep_hours: string;
  ever_smoked: boolean;
  smoke_now?: string;
  
  // Step 4: Alcohol
  ever_drank: boolean;
  drink_frequency?: string;
  drinks_per_occasion?: string;
  binge_drinking_freq?: string;
  
  // Step 5: Diet
  diet_level: string;
  fried_food_freq: string;
  salty_food_freq: string;
  fruit_veg_servings: string;
  
  // Step 6: Health Background
  health_goals: string[];
  allergies: string[];
  dietary_practice: string;
};

const defaultData: BaselineData = {
  first_name: '', last_name: '', date_of_birth: '', sex: '', height_cm: '', weight_kg: '',
  vigorous_activity: false, moderate_activity: false, walk_bike_transport: false, sedentary_hours: '',
  sleep_hours: '', ever_smoked: false,
  ever_drank: false,
  diet_level: '', fried_food_freq: '', salty_food_freq: '', fruit_veg_servings: '',
  health_goals: [], allergies: [], dietary_practice: 'None'
};

interface BaselineContextType {
  data: BaselineData;
  updateData: (updates: Partial<BaselineData>) => void;
  resetData: () => void;
}

const BaselineContext = createContext<BaselineContextType | undefined>(undefined);

export function BaselineProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BaselineData>(defaultData);

  const updateData = (updates: Partial<BaselineData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const resetData = () => {
    setData(defaultData);
  };

  return (
    <BaselineContext.Provider value={{ data, updateData, resetData }}>
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
