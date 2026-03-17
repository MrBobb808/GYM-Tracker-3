import { DailyStats, RecoveryLog, WorkoutLog, SleepData, DataSource, SessionType } from '../types';

// ============================================================================
// REACT NATIVE BRIDGE MOCK
// ============================================================================
// In a true React Native environment, you would import the NativeModule:
// import { NativeModules } from 'react-native';
// const { HealthKitBridge } = NativeModules;

// For this web-based preview environment, we mock the NativeModule response
// to demonstrate the exact data flow and mapping logic without crashing Vite.
const HealthKitBridge = {
  requestPermissions: async (): Promise<boolean> => {
    console.log("[HealthKitBridge] Requesting permissions...");
    return true;
  },
  fetchBiometrics: async (startDateIso: string, endDateIso: string): Promise<any> => {
    console.log(`[HealthKitBridge] Fetching biometrics from ${startDateIso} to ${endDateIso}`);
    return {
      hrv: 45.2, // ms
      restingHeartRate: 52, // bpm
      sleep: { deep: 90, rem: 120, light: 210, awake: 15, total: 435 } as SleepData
    };
  },
  fetchWorkouts: async (startDateIso: string, endDateIso: string): Promise<any[]> => {
    console.log(`[HealthKitBridge] Fetching workouts from ${startDateIso} to ${endDateIso}`);
    return [
      {
        id: 'hk-uuid-1234',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 90 * 60000).toISOString(),
        duration: 90 * 60, // seconds
        activityType: 52, // HKWorkoutActivityType.martialArts
        sourceName: 'Apple Watch',
        activeEnergyBurned: 650, // kcal
        averageHeartRate: 142,
        maxHeartRate: 178
      },
      {
        id: 'hk-uuid-5678',
        startDate: new Date(Date.now() - 24 * 60 * 60000).toISOString(),
        endDate: new Date(Date.now() - 23 * 60 * 60000).toISOString(),
        duration: 60 * 60, // seconds
        activityType: 50, // HKWorkoutActivityType.traditionalStrengthTraining
        sourceName: 'Apple Watch',
        activeEnergyBurned: 420, // kcal
        averageHeartRate: 125,
        maxHeartRate: 160
      }
    ];
  }
};

// ============================================================================
// HEALTHKIT SERVICE & MAPPING LOGIC
// ============================================================================

export class HealthKitService {
  
  /**
   * Requests authorization to read/write HealthKit data.
   */
  static async connect(): Promise<boolean> {
    try {
      return await HealthKitBridge.requestPermissions();
    } catch (error) {
      console.error("HealthKit connection failed:", error);
      return false;
    }
  }

  /**
   * Syncs daily biometrics (HRV, RHR, Sleep) into our RecoveryLog format.
   */
  static async syncDailyBiometrics(dateStr: string): Promise<Partial<RecoveryLog> | null> {
    try {
      // Create ISO strings for the start and end of the requested day
      const start = new Date(`${dateStr}T00:00:00Z`).toISOString();
      const end = new Date(`${dateStr}T23:59:59Z`).toISOString();

      const rawData = await HealthKitBridge.fetchBiometrics(start, end);

      if (!rawData) return null;

      return {
        hrv: rawData.hrv,
        restingHeartRate: rawData.restingHeartRate,
        sleepData: rawData.sleep
      };
    } catch (error) {
      console.error("Failed to sync biometrics:", error);
      return null;
    }
  }

  /**
   * Syncs workouts from Apple Health and maps them to our WorkoutLog format.
   */
  static async syncWorkouts(dateStr: string): Promise<Partial<WorkoutLog>[]> {
    try {
      const start = new Date(`${dateStr}T00:00:00Z`).toISOString();
      const end = new Date(`${dateStr}T23:59:59Z`).toISOString();

      const rawWorkouts = await HealthKitBridge.fetchWorkouts(start, end);
      
      return rawWorkouts.map(hkWorkout => {
        // Map HKWorkoutActivityType enum to our SessionType
        // 52 = martialArts, 50 = traditionalStrengthTraining
        let type: SessionType = 'weight';
        if (hkWorkout.activityType === 52) type = 'bjj';
        if (hkWorkout.activityType === 50) type = 'strength';

        // Map source
        let source: DataSource = 'HealthKit';
        if (hkWorkout.sourceName?.includes('Watch')) source = 'AppleWatch';

        return {
          id: `hk_${hkWorkout.id}`,
          date: dateStr,
          type,
          source,
          activeEnergyBurned: hkWorkout.activeEnergyBurned,
          averageHeartRate: hkWorkout.averageHeartRate,
          maxHeartRate: hkWorkout.maxHeartRate,
          // If it's BJJ, we can estimate rounds based on duration (e.g., 5 min rounds + rest)
          rounds: type === 'bjj' ? Math.floor((hkWorkout.duration / 60) / 6) : undefined,
          timestamp: hkWorkout.startDate
        };
      });
    } catch (error) {
      console.error("Failed to sync workouts:", error);
      return [];
    }
  }

  /**
   * Dynamic Macro Calibration Algorithm
   * Adjusts daily macro targets based on real-time Active Energy Burned.
   */
  static calculateDynamicMacros(
    baseCalories: number, 
    activeEnergyBurned: number, 
    preference: 'balanced' | 'low-carb' | 'high-protein' = 'balanced'
  ) {
    // 1. Calculate Total Target
    // We add 80% of active energy burned back into the diet to fuel recovery 
    // without completely erasing the deficit.
    const dynamicAdjustment = Math.round(activeEnergyBurned * 0.8);
    const targetCalories = baseCalories + dynamicAdjustment;

    // 2. Distribute Macros based on preference and strain
    let pPct = 0.30, cPct = 0.40, fPct = 0.30; // Balanced default

    if (preference === 'high-protein') {
      pPct = 0.40; cPct = 0.30; fPct = 0.30;
    } else if (preference === 'low-carb') {
      pPct = 0.35; cPct = 0.20; fPct = 0.45;
    }

    // Dynamic Carb Loading for High Strain Days
    // If active energy is very high (e.g., heavy lifting + BJJ sparring > 800kcal),
    // shift the extra calories heavily towards carbohydrates for glycogen replenishment.
    if (activeEnergyBurned > 800) {
      cPct += 0.10; // Shift 10% to carbs
      fPct -= 0.10; // Take 10% from fats
    }

    // 3. Convert percentages to grams
    // Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g
    const targetProtein = Math.round((targetCalories * pPct) / 4);
    const targetCarbs = Math.round((targetCalories * cPct) / 4);
    const targetFat = Math.round((targetCalories * fPct) / 9);

    return {
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      dynamicCalorieAdjustment: dynamicAdjustment
    };
  }
}
