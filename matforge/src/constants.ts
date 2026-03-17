import { Trophy, Star, Medal, Shield, Swords, Mountain, Crown, TrendingDown, Activity, Target, Crosshair, Zap, Flame, Dumbbell, Anchor, Battery, Gauge } from 'lucide-react';
import React from 'react';

export const WORKOUT_PLAN = {
  "Maintenance Phase (Weeks 1 & 2)": {
    "Saturday: Full-Body Bridge": [
      { exercise: "Conventional Deadlift", sets: 3, target: "3-5 reps" },
      { exercise: "Weighted Pull-Ups", sets: 3, target: "5-8 reps" },
      { exercise: "Dumbbell Bench Press", sets: 3, target: "6-8 reps" },
      { exercise: "Farmer's Carries", sets: 2, target: "60 sec" }
    ]
  },
  "Building Phase (Weeks 3 & 4)": {
    "Tuesday: Lower Body Power": [
      { exercise: "Conventional Deadlift", sets: 4, target: "3-5 reps" },
      { exercise: "Barbell Hip Thrusts", sets: 3, target: "6-8 reps" },
      { exercise: "Barbell Back Squat", sets: 3, target: "6-8 reps" },
      { exercise: "Kettlebell Swings", sets: 3, target: "12-15 reps" }
    ],
    "Wednesday: Upper Body Pull/Push": [
      { exercise: "Weighted Pull-Ups", sets: 4, target: "4-6 reps" },
      { exercise: "Dumbbell Bench Press", sets: 3, target: "6-8 reps" },
      { exercise: "Bent-Over BB Rows", sets: 3, target: "6-8 reps" },
      { exercise: "Heavy Farmer's Carries", sets: 3, target: "45 sec" }
    ],
    "Thursday: Core & BJJ Specifics": [
      { exercise: "Zercher Squats", sets: 3, target: "6-8 reps" },
      { exercise: "Cable Woodchoppers", sets: 3, target: "8-10 /side" },
      { exercise: "Swiss Ball Stir the Pot", sets: 3, target: "30 sec" },
      { exercise: "Towel Pull-Up Holds", sets: 3, target: "Max Time" }
    ]
  }
};

export const TROPHY_DEFINITIONS = [
  // --- STRENGTH: DEADLIFT ---
  { id: 'dl_1', title: "Novice Deadlift", desc: "Deadlift 225 lbs", category: 'strength', exercise: 'Conventional Deadlift', value: 225, color: 'rose' },
  { id: 'dl_2', title: "Intermediate Deadlift", desc: "Deadlift 315 lbs", category: 'strength', exercise: 'Conventional Deadlift', value: 315, color: 'blue' },
  { id: 'dl_3', title: "Advanced Deadlift", desc: "Deadlift 405 lbs", category: 'strength', exercise: 'Conventional Deadlift', value: 405, color: 'emerald' },
  { id: 'dl_4', title: "Elite Deadlift", desc: "Deadlift 500 lbs", category: 'strength', exercise: 'Conventional Deadlift', value: 500, color: 'purple' },
  { id: 'dl_5', title: "Master Deadlift", desc: "Deadlift 600 lbs", category: 'strength', exercise: 'Conventional Deadlift', value: 600, color: 'orange' },
  { id: 'dl_6', title: "Bodyweight Deadlift", desc: "Deadlift 1x Bodyweight", category: 'strength', exercise: 'Conventional Deadlift', value: 1, isMultiplier: true, color: 'red' },
  { id: 'dl_7', title: "1.5x BW Deadlift", desc: "Deadlift 1.5x Bodyweight", category: 'strength', exercise: 'Conventional Deadlift', value: 1.5, isMultiplier: true, color: 'cyan' },
  { id: 'dl_8', title: "2x BW Deadlift", desc: "Deadlift 2x Bodyweight", category: 'strength', exercise: 'Conventional Deadlift', value: 2, isMultiplier: true, color: 'zinc' },
  { id: 'dl_9', title: "2.5x BW Deadlift", desc: "Deadlift 2.5x Bodyweight", category: 'strength', exercise: 'Conventional Deadlift', value: 2.5, isMultiplier: true, color: 'rose' },
  { id: 'dl_10', title: "3x BW Deadlift", desc: "Deadlift 3x Bodyweight", category: 'strength', exercise: 'Conventional Deadlift', value: 3, isMultiplier: true, color: 'yellow' },

  // --- STRENGTH: SQUAT ---
  { id: 'sq_1', title: "Novice Squat", desc: "Squat 135 lbs", category: 'strength', exercise: 'Barbell Back Squat', value: 135, color: 'rose' },
  { id: 'sq_2', title: "Intermediate Squat", desc: "Squat 225 lbs", category: 'strength', exercise: 'Barbell Back Squat', value: 225, color: 'blue' },
  { id: 'sq_3', title: "Advanced Squat", desc: "Squat 315 lbs", category: 'strength', exercise: 'Barbell Back Squat', value: 315, color: 'emerald' },
  { id: 'sq_4', title: "Elite Squat", desc: "Squat 405 lbs", category: 'strength', exercise: 'Barbell Back Squat', value: 405, color: 'purple' },
  { id: 'sq_5', title: "Master Squat", desc: "Squat 500 lbs", category: 'strength', exercise: 'Barbell Back Squat', value: 500, color: 'orange' },
  { id: 'sq_6', title: "Bodyweight Squat", desc: "Squat 1x Bodyweight", category: 'strength', exercise: 'Barbell Back Squat', value: 1, isMultiplier: true, color: 'red' },
  { id: 'sq_7', title: "1.5x BW Squat", desc: "Squat 1.5x Bodyweight", category: 'strength', exercise: 'Barbell Back Squat', value: 1.5, isMultiplier: true, color: 'cyan' },
  { id: 'sq_8', title: "2x BW Squat", desc: "Squat 2x Bodyweight", category: 'strength', exercise: 'Barbell Back Squat', value: 2, isMultiplier: true, color: 'zinc' },
  { id: 'sq_9', title: "2.5x BW Squat", desc: "Squat 2.5x Bodyweight", category: 'strength', exercise: 'Barbell Back Squat', value: 2.5, isMultiplier: true, color: 'rose' },

  // --- STRENGTH: BENCH ---
  { id: 'bp_1', title: "Novice Bench Press", desc: "Bench Press 135 lbs", category: 'strength', exercise: 'Dumbbell Bench Press', value: 135, color: 'rose' },
  { id: 'bp_2', title: "Intermediate Bench Press", desc: "Bench Press 185 lbs", category: 'strength', exercise: 'Dumbbell Bench Press', value: 185, color: 'blue' },
  { id: 'bp_3', title: "Advanced Bench Press", desc: "Bench Press 225 lbs", category: 'strength', exercise: 'Dumbbell Bench Press', value: 225, color: 'emerald' },
  { id: 'bp_4', title: "Elite Bench Press", desc: "Bench Press 315 lbs", category: 'strength', exercise: 'Dumbbell Bench Press', value: 315, color: 'purple' },
  { id: 'bp_5', title: "Master Bench Press", desc: "Bench Press 405 lbs", category: 'strength', exercise: 'Dumbbell Bench Press', value: 405, color: 'orange' },
  { id: 'bp_6', title: "Bodyweight Bench Press", desc: "Bench Press 1x Bodyweight", category: 'strength', exercise: 'Dumbbell Bench Press', value: 1, isMultiplier: true, color: 'red' },
  { id: 'bp_7', title: "1.25x BW Bench Press", desc: "Bench Press 1.25x Bodyweight", category: 'strength', exercise: 'Dumbbell Bench Press', value: 1.25, isMultiplier: true, color: 'cyan' },
  { id: 'bp_8', title: "1.5x BW Bench Press", desc: "Bench Press 1.5x Bodyweight", category: 'strength', exercise: 'Dumbbell Bench Press', value: 1.5, isMultiplier: true, color: 'zinc' },
  { id: 'bp_9', title: "2x BW Bench Press", desc: "Bench Press 2x Bodyweight", category: 'strength', exercise: 'Dumbbell Bench Press', value: 2, isMultiplier: true, color: 'rose' },

  // --- STRENGTH: PULL-UPS ---
  { id: 'pu_1', title: "First Pull-up", desc: "Complete 1 Pull-up", category: 'strength', exercise: 'Weighted Pull-Ups', value: 1, color: 'rose' },
  { id: 'pu_2', title: "5 Pull-ups", desc: "Complete 5 Pull-ups", category: 'strength', exercise: 'Weighted Pull-Ups', value: 5, color: 'blue' },
  { id: 'pu_3', title: "10 Pull-ups", desc: "Complete 10 Pull-ups", category: 'strength', exercise: 'Weighted Pull-Ups', value: 10, color: 'emerald' },
  { id: 'pu_4', title: "15 Pull-ups", desc: "Complete 15 Pull-ups", category: 'strength', exercise: 'Weighted Pull-Ups', value: 15, color: 'purple' },
  { id: 'pu_5', title: "20 Pull-ups", desc: "Complete 20 Pull-ups", category: 'strength', exercise: 'Weighted Pull-Ups', value: 20, color: 'orange' },
  { id: 'pu_6', title: "Weighted Pull-up +25 lbs", desc: "Pull-up with +25 lbs", category: 'strength', exercise: 'Weighted Pull-Ups', value: 25, isWeighted: true, color: 'red' },
  { id: 'pu_7', title: "Weighted Pull-up +45 lbs", desc: "Pull-up with +45 lbs", category: 'strength', exercise: 'Weighted Pull-Ups', value: 45, isWeighted: true, color: 'cyan' },
  { id: 'pu_8', title: "Weighted Pull-up +90 lbs", desc: "Pull-up with +90 lbs", category: 'strength', exercise: 'Weighted Pull-Ups', value: 90, isWeighted: true, color: 'zinc' },

  // --- STRENGTH: ROWS ---
  { id: 'row_1', title: "Novice Row", desc: "Barbell or Pendlay Row 135 lbs", category: 'strength', exercise: 'Barbell Row', value: 135, color: 'rose' },
  { id: 'row_2', title: "Intermediate Row", desc: "Barbell or Pendlay Row 185 lbs", category: 'strength', exercise: 'Barbell Row', value: 185, color: 'blue' },
  { id: 'row_3', title: "Advanced Row", desc: "Barbell or Pendlay Row 225 lbs", category: 'strength', exercise: 'Barbell Row', value: 225, color: 'emerald' },
  { id: 'row_4', title: "Elite Row", desc: "Barbell or Pendlay Row 315 lbs", category: 'strength', exercise: 'Barbell Row', value: 315, color: 'purple' },
  { id: 'row_5', title: "Bodyweight Row", desc: "Row 1x your bodyweight", category: 'strength', exercise: 'Barbell Row', value: 1, isMultiplier: true, color: 'red' },

  // --- STRENGTH: KROC ROWS ---
  { id: 'kroc_1', title: "Kroc Row Beginner", desc: "1-Arm DB Row 60 lbs for 15+ reps", category: 'strength', exercise: '1-Arm Dumbbell Row', value: 60, minReps: 15, color: 'rose' },
  { id: 'kroc_2', title: "Kroc Row Advanced", desc: "1-Arm DB Row 100 lbs for 15+ reps", category: 'strength', exercise: '1-Arm Dumbbell Row', value: 100, minReps: 15, color: 'purple' },

  // --- STRENGTH: INVERTED ROWS ---
  { id: 'inv_1', title: "Inverted Row Specialist", desc: "Complete 20 Bodyweight Inverted Rows", category: 'strength', exercise: 'Inverted Row', value: 20, isRepsOnly: true, color: 'emerald' },

  // --- STRENGTH: FARMER'S CARRY ---
  { id: 'farm_1', title: "Farmer's Carry (Bronze)", desc: "Carry 50% BW for 100 meters", category: 'strength', exercise: "Farmer's Carry", value: 0.5, isMultiplier: true, minDistance: 100, color: 'rose' },
  { id: 'farm_2', title: "Farmer's Carry (Gold)", desc: "Carry 100% BW for 100 meters", category: 'strength', exercise: "Farmer's Carry", value: 1, isMultiplier: true, minDistance: 100, color: 'yellow' },

  // --- BJJ: ROUNDS ---
  { id: 'bjj_r1', title: "Bronze Mat Rat", desc: "Roll 5 rounds in one session", category: 'bjj', metric: 'rounds', value: 5, color: 'rose' },
  { id: 'bjj_r2', title: "Silver Mat Rat", desc: "Roll 10 rounds in one session", category: 'bjj', metric: 'rounds', value: 10, color: 'zinc' },
  { id: 'bjj_r3', title: "Gold Mat Rat", desc: "Roll 15 rounds in one session", category: 'bjj', metric: 'rounds', value: 15, color: 'yellow' },

  // --- BJJ: WEEKLY VOLUME ---
  { id: 'bjj_w1', title: "Weekly Warrior (Bronze)", desc: "Roll 30 rounds in a week", category: 'bjj', metric: 'weekly_rounds', value: 30, color: 'rose' },
  { id: 'bjj_w2', title: "Weekly Warrior (Silver)", desc: "Roll 40 rounds in a week", category: 'bjj', metric: 'weekly_rounds', value: 40, color: 'zinc' },
  { id: 'bjj_w3', title: "Weekly Warrior (Gold)", desc: "Roll 45 rounds in a week", category: 'bjj', metric: 'weekly_rounds', value: 45, color: 'yellow' },

  // --- BJJ: PROMOTION ---
  { id: 'bjj_p1', title: "Level Up", desc: "Log a belt or stripe promotion", category: 'bjj', metric: 'promotion', value: 1, color: 'purple' },

  // --- BJJ: ATTENDANCE ---
  { id: 'bjj_a1', title: "10 Classes", desc: "Attend 10 BJJ classes", category: 'bjj', metric: 'attendance', value: 10, color: 'rose' },
  { id: 'bjj_a2', title: "25 Classes", desc: "Attend 25 BJJ classes", category: 'bjj', metric: 'attendance', value: 25, color: 'blue' },
  { id: 'bjj_a3', title: "50 Classes", desc: "Attend 50 BJJ classes", category: 'bjj', metric: 'attendance', value: 50, color: 'emerald' },
  { id: 'bjj_a4', title: "100 Classes", desc: "Attend 100 BJJ classes", category: 'bjj', metric: 'attendance', value: 100, color: 'purple' },
  { id: 'bjj_a5', title: "250 Classes", desc: "Attend 250 BJJ classes", category: 'bjj', metric: 'attendance', value: 250, color: 'orange' },
  { id: 'bjj_a6', title: "500 Classes", desc: "Attend 500 BJJ classes", category: 'bjj', metric: 'attendance', value: 500, color: 'red' },

  // --- CONSISTENCY ---
  { id: 'con_1', title: "10 Workouts", desc: "Complete 10 total workouts", category: 'consistency', value: 10, color: 'rose' },
  { id: 'con_2', title: "25 Workouts", desc: "Complete 25 total workouts", category: 'consistency', value: 25, color: 'blue' },
  { id: 'con_3', title: "50 Workouts", desc: "Complete 50 total workouts", category: 'consistency', value: 50, color: 'emerald' },
  { id: 'con_4', title: "100 Workouts", desc: "Complete 100 total workouts", category: 'consistency', value: 100, color: 'purple' },
  { id: 'con_5', title: "250 Workouts", desc: "Complete 250 total workouts", category: 'consistency', value: 250, color: 'orange' },
  { id: 'con_6', title: "500 Workouts", desc: "Complete 500 total workouts", category: 'consistency', value: 500, color: 'red' },
  { id: 'con_7', title: "1000 Workouts", desc: "Complete 1000 total workouts", category: 'consistency', value: 1000, color: 'cyan' },

  // --- RECOVERY ---
  { id: 'rec_1', title: "10 Recovery Logs", desc: "Log 10 recovery check-ins", category: 'recovery', value: 10, color: 'rose' },
  { id: 'rec_2', title: "25 Recovery Logs", desc: "Log 25 recovery check-ins", category: 'recovery', value: 25, color: 'blue' },
  { id: 'rec_3', title: "50 Recovery Logs", desc: "Log 50 recovery check-ins", category: 'recovery', value: 50, color: 'emerald' },
  { id: 'rec_4', title: "100 Recovery Logs", desc: "Log 100 recovery check-ins", category: 'recovery', value: 100, color: 'purple' },
  { id: 'rec_5', title: "250 Recovery Logs", desc: "Log 250 recovery check-ins", category: 'recovery', value: 250, color: 'orange' },
  { id: 'rec_6', title: "500 Recovery Logs", desc: "Log 500 recovery check-ins", category: 'recovery', value: 500, color: 'red' },
];

export const RECOVERY_METRICS = [
  { id: 'sleep', label: 'Sleep Quality', icon: 'Moon' },
  { id: 'energy', label: 'Energy Level', icon: 'Zap' },
  { id: 'soreness', label: 'Muscle Soreness', icon: 'Activity' },
  { id: 'stress', label: 'Stress Level', icon: 'Brain' }
];

export const WEIGHT_LOSS_TIPS = [
  "Drink a glass of water before every meal to feel fuller faster.",
  "Prioritize protein in every meal to maintain muscle mass while losing fat.",
  "Get at least 7-8 hours of sleep; lack of sleep can increase hunger hormones.",
  "Walk at least 10,000 steps a day to increase your non-exercise activity thermogenesis (NEAT).",
  "Avoid drinking your calories; stick to water, black coffee, or tea.",
  "Eat slowly and mindfully; it takes about 20 minutes for your brain to signal fullness.",
  "Fiber is your friend. Aim for 25-30g of fiber daily from whole foods.",
  "Don't skip meals; it often leads to overeating later in the day.",
  "Use smaller plates to help with portion control.",
  "Keep healthy snacks like nuts or fruit handy to avoid reaching for junk food.",
  "Consistency over perfection. One bad meal won't ruin your progress.",
  "Track your progress beyond the scale—measure waist circumference and take photos.",
  "Strength training helps boost your metabolism even when you're at rest.",
  "Reduce processed sugar intake; it's often hidden in 'healthy' snacks.",
  "Meal prep on weekends to avoid impulsive food choices during the week."
];

export const WEIGHT_GOAL = 230;

export const COLORS = {
  rose: { color: 'text-rose-400', glow: 'shadow-[0_0_20px_rgba(251,113,133,0.3)]', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  blue: { color: 'text-blue-400', glow: 'shadow-[0_0_20px_rgba(96,165,250,0.3)]', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  yellow: { color: 'text-yellow-400', glow: 'shadow-[0_0_20px_rgba(250,204,21,0.3)]', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  emerald: { color: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.3)]', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  purple: { color: 'text-purple-400', glow: 'shadow-[0_0_20px_rgba(192,132,252,0.3)]', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  orange: { color: 'text-orange-400', glow: 'shadow-[0_0_20px_rgba(251,146,60,0.3)]', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  cyan: { color: 'text-cyan-400', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  red: { color: 'text-red-400', glow: 'shadow-[0_0_20px_rgba(248,113,113,0.3)]', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  zinc: { color: 'text-zinc-300', glow: 'shadow-[0_0_20px_rgba(212,212,216,0.3)]', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20' },
};
