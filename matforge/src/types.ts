import React from 'react';

export interface WorkoutSet {
  weight: string;
  reps: string;
  estimated1RM?: number;
}

export type SessionType = 'strength' | 'bjj' | 'weight';

export type DataSource = 'Manual' | 'AppleWatch' | 'HealthKit' | 'Other';

export interface WorkoutLog {
  id?: string;
  date: string;
  phase: string;
  day: string;
  type: SessionType;
  source?: DataSource; // To track if it came from Apple Watch
  exercise?: string; // For strength
  sets?: WorkoutSet[]; // For strength
  
  // BJJ specific
  rounds?: number;
  attendedClass?: boolean;
  
  // Reflection
  hardestPart?: string;
  whatWentWell?: string;
  techniqueNotes?: string;
  notes?: string; // General notes for BJJ
  
  // Metrics
  sessionLoad?: number;
  caloriesBurned?: number;
  activeEnergyBurned?: number; // kcal from HealthKit
  averageHeartRate?: number; // bpm from HealthKit
  maxHeartRate?: number; // bpm from HealthKit
  timestamp: string;
}

export interface SleepData {
  deep: number; // minutes
  rem: number; // minutes
  light: number; // minutes
  awake: number; // minutes
  total: number; // minutes
}

export interface RecoveryLog {
  id?: string;
  date: string;
  sleep: number; // 1-5
  energy: number; // 1-5
  soreness: number; // 1-5
  stress: number; // 1-5
  score: number;
  
  // HealthKit Biometrics
  hrv?: number; // Heart Rate Variability in ms
  restingHeartRate?: number; // bpm
  sleepData?: SleepData; // Detailed sleep stages
  
  timestamp: string;
}

export interface DailyStats {
  id?: string;
  isDailyStats: boolean;
  date: string;
  time?: string;
  bodyWeight: number | null;
  bmi?: number;
  bodyFat?: number;
  water?: number;
  muscles?: number;
  bone?: number;
  caloriesBurned: number;
  caloriesConsumed?: number;
  baseCalories: number;
  
  // Dynamic Macro Targets
  targetCalories?: number;
  targetCarbs?: number; // grams
  targetProtein?: number; // grams
  targetFat?: number; // grams
  dynamicCalorieAdjustment?: number; // +/- kcal based on activity
  
  trainingLoad: number;
  recoveryScore?: number;
  
  // Sync Metadata
  lastSyncTimestamp?: string;
  
  timestamp: string;
}

export interface UserProfile {
  hasCompletedOnboarding?: boolean;
  baseWeight?: number;
  height?: number; // inches
  gender?: 'male' | 'female';
  age?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
  macroSplitPreference?: 'balanced' | 'low-carb' | 'high-protein';
  healthKitConnected?: boolean;
  onboardingDate?: string;
  bjjBelt?: 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black';
  bjjStripes?: number;
  
  // RPG Progression
  xp?: number;
  level?: number;
  inventory?: string[];
  activeQuest?: ForgeMasterResponse | null;
  dynamicAchievements?: DynamicAchievement[];
  unlockedTrophies?: string[];
}

export interface Trophy {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  progress: number;
  unlocked: boolean;
  color: string;
  glow: string;
  bg: string;
  border: string;
}

export interface WeeklySummary {
  id?: string;
  weekEnding: string;
  poundsLost: number;
  bjjHours: number;
  liftingVolume: number; // lbs
  caloricAdherence: number; // percentage
  imageUrl?: string;
  prompt?: string;
  style: '3d' | 'comic' | 'photorealistic';
  timestamp: string;
}

export interface ItemReward {
  item_name: string;
  item_type: 'Headgear' | 'Chest' | 'Hands' | 'Accessory';
}

export interface DynamicAchievement {
  achievement_name: string;
  unlock_condition: string;
  linked_item_reward: ItemReward;
  isUnlocked?: boolean;
}

export interface ForgeQuest {
  quest_type: "Daily Bounty" | "Side Quest" | "Boss Fight";
  quest_title: string;
  lore_description: string;
  real_world_objective: string;
}

export interface ForgeMasterResponse {
  armory_summary: string;
  quest: ForgeQuest;
  new_achievement_to_add: DynamicAchievement;
}

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
