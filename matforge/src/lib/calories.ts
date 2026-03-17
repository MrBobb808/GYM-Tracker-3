import { UserProfile } from '../types';

export function calculateBMR(profile: UserProfile, currentWeightLbs: number): number {
  const weightKg = currentWeightLbs / 2.20462;
  const heightCm = (profile.height || 70) * 2.54; // Default 5'10"
  const age = profile.age || 30; // Default 30
  const isMale = profile.gender !== 'female'; // Default male

  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  bmr += isMale ? 5 : -161;

  return Math.max(0, bmr);
}

export function calculateTDEE(bmr: number, activityLevel: string = 'moderate'): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    extra: 1.9
  };
  return bmr * (multipliers[activityLevel] || 1.55);
}

export function calculateExerciseCalories(bmr: number, minutes: number, met: number = 6.0): number {
  // BMR is per day. BMR / 24 / 60 is BMR per minute.
  // Using the Harris-Benedict derived MET equivalent:
  // kcal = (BMR / 1440) * MET * minutes
  return Math.round((bmr / 1440) * met * minutes);
}
