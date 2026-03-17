import { useMemo } from 'react';
import { WorkoutLog, DailyStats, RecoveryLog, UserProfile } from '../types';
import { WEIGHT_GOAL, TROPHY_DEFINITIONS } from '../constants';
import { calculateBMR, calculateTDEE } from '../lib/calories';

export function useMetrics(logs: WorkoutLog[], dailyStats: DailyStats[], recoveryLogs: RecoveryLog[], profile: UserProfile | null) {
  const totalWorkouts = useMemo(() => new Set(logs.map(l => l.date)).size, [logs]);
  const strengthLogs = useMemo(() => logs.filter(l => l.type === 'strength'), [logs]);
  const bjjLogs = useMemo(() => logs.filter(l => l.type === 'bjj'), [logs]);
  
  const totalBjjRounds = useMemo(() => bjjLogs.reduce((acc, log) => acc + (log.rounds || 0), 0), [bjjLogs]);
  
  const calculateExerciseMetrics = (exName: string) => {
    const exerciseLogs = logs.filter(l => l.exercise === exName).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let absoluteMax = 0;
    let current1RM = 0;
    const progression: { date: string, value: number }[] = [];

    exerciseLogs.forEach(log => {
      let dayMax1RM = 0;
      if (log.sets) {
        log.sets.forEach(s => {
          const w = parseFloat(s.weight) || 0;
          const r = parseFloat(s.reps) || 0;
          absoluteMax = Math.max(absoluteMax, w);
          if (w > 0 && r > 0) {
            const est = s.estimated1RM || Math.round(w * (1 + r / 30));
            dayMax1RM = Math.max(dayMax1RM, est);
          }
        });
      }
      if (dayMax1RM > 0) {
        current1RM = dayMax1RM;
        progression.push({ date: log.date, value: dayMax1RM });
      }
    });

    return { absoluteMax, current1RM, progression };
  };

  const deadlift = useMemo(() => calculateExerciseMetrics("Conventional Deadlift"), [logs]);
  const squat = useMemo(() => calculateExerciseMetrics("Barbell Back Squat"), [logs]);
  const bench = useMemo(() => calculateExerciseMetrics("Dumbbell Bench Press"), [logs]);
  const pullup = useMemo(() => calculateExerciseMetrics("Weighted Pull-Ups"), [logs]);

  const bjj = useMemo(() => {
    const totalClasses = bjjLogs.filter(l => l.attendedClass).length;
    const attendanceRate = bjjLogs.length > 0 ? Math.round((totalClasses / bjjLogs.length) * 100) : 0;
    const avgRounds = bjjLogs.length > 0 ? (totalBjjRounds / bjjLogs.length).toFixed(1) : '0';
    const maxRounds = bjjLogs.reduce((max, l) => Math.max(max, l.rounds || 0), 0);
    const roundsThisWeek = bjjLogs
      .filter(l => {
        const d = new Date(l.date);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 7;
      })
      .reduce((acc, l) => acc + (l.rounds || 0), 0);
    const sessionsThisWeek = bjjLogs.filter(l => {
      const d = new Date(l.date);
      const now = new Date();
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    }).length;

    return { attendanceRate, totalClasses, avgRounds, totalRounds: totalBjjRounds, maxRounds, roundsThisWeek, sessionsThisWeek };
  }, [bjjLogs, totalBjjRounds]);

  const trainingLoadStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const dailyLoad = logs.filter(l => l.date === today).reduce((acc, l) => acc + (l.sessionLoad || 0), 0);
    
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    const weeklyLoad = logs
      .filter(l => last7Days.includes(l.date))
      .reduce((acc, l) => acc + (l.sessionLoad || 0), 0);

    // 7-day rolling average over the last 28 days
    const last28Days = Array.from({ length: 28 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    const total28DayLoad = logs
      .filter(l => last28Days.includes(l.date))
      .reduce((acc, l) => acc + (l.sessionLoad || 0), 0);
    
    const rollingAvgLoad = total28DayLoad / 4; // Average weekly load over 4 weeks

    const loadWarning = weeklyLoad > rollingAvgLoad * 1.3;

    return { dailyLoad, weeklyLoad, rollingAvgLoad, loadWarning };
  }, [logs]);

  const calorieStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayStats = dailyStats.find(s => s.date === today);
    
    const consumed = todayStats?.caloriesConsumed || 0;
    const burned = (todayStats?.baseCalories || 2000) + (todayStats?.caloriesBurned || 0);
    const remaining = burned - consumed;

    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    const weeklyDeficit = dailyStats
      .filter(s => last7Days.includes(s.date))
      .reduce((acc, s) => {
        const b = (s.baseCalories || 2000) + (s.caloriesBurned || 0);
        const c = s.caloriesConsumed || 0;
        return acc + (b - c);
      }, 0);

    const projectedFatLoss = (weeklyDeficit / 3500).toFixed(1);

    return { consumed, burned, remaining, weeklyDeficit, projectedFatLoss };
  }, [dailyStats]);

  const recoveryStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecovery = recoveryLogs.find(r => r.date === today);
    
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    const trend = recoveryLogs
      .filter(r => last7Days.includes(r.date))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(r => ({ date: r.date, score: r.score }));

    return { 
      currentScore: todayRecovery?.score || 0,
      trend 
    };
  }, [recoveryLogs]);

  const recommendedAction = useMemo(() => {
    const score = recoveryStats.currentScore;
    const load = trainingLoadStats.weeklyLoad;
    const avgLoad = trainingLoadStats.rollingAvgLoad;

    if (score > 0 && score < 60) return "Recovery score is low. Consider a lighter session today.";
    if (load > avgLoad * 1.2) return "Training load is high this week. Focus on active recovery.";
    if (score >= 80) return "Recovery is optimal. High intensity session recommended.";
    return "Training load is moderate. Strength training recommended.";
  }, [recoveryStats, trainingLoadStats]);

  const chronoStats = useMemo(() => {
    return [...dailyStats]
      .filter(s => s.bodyWeight)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [dailyStats]);

  const currentWeight = useMemo(() => chronoStats.length > 0 ? (chronoStats[chronoStats.length - 1].bodyWeight || 0) : 0, [chronoStats]);
  const startWeight = useMemo(() => chronoStats.length > 0 ? (chronoStats[0].bodyWeight || 0) : 0, [chronoStats]);
  
  const weightLossStats = useMemo(() => {
    const lost = startWeight > 0 ? Math.max(0, startWeight - currentWeight) : 0;
    const remaining = currentWeight > 0 ? Math.max(0, currentWeight - WEIGHT_GOAL) : 0;
    const totalGoal = startWeight > 0 ? Math.max(0, startWeight - WEIGHT_GOAL) : 0;
    const progressPercent = totalGoal > 0 ? Math.round((lost / totalGoal) * 100) : 0;
    
    const weightTrend = chronoStats.map(s => ({ date: s.date, weight: s.bodyWeight }));

    // Calculate additional data points using the full historical range
    const lowestWeight = chronoStats.length > 0 ? Math.min(...chronoStats.map(s => s.bodyWeight || Infinity)) : 0;
    const highestWeight = chronoStats.length > 0 ? Math.max(...chronoStats.map(s => s.bodyWeight || 0)) : 0;
    
    const daysTracking = chronoStats.length > 1 
      ? Math.round((new Date(chronoStats[chronoStats.length - 1].timestamp).getTime() - new Date(chronoStats[0].timestamp).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weight7DaysAgo = chronoStats.find(s => new Date(s.timestamp) >= sevenDaysAgo)?.bodyWeight || currentWeight;
    const weeklyChange = currentWeight - weight7DaysAgo;

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const weight30DaysAgo = chronoStats.find(s => new Date(s.timestamp) >= thirtyDaysAgo)?.bodyWeight || currentWeight;
    const monthlyChange = currentWeight - weight30DaysAgo;

    const latestStats = chronoStats[chronoStats.length - 1];

    // Prediction Logic
    let projectedDays = null;
    let projectedDate = null;
    let weeklyRate = 0;

    if (daysTracking > 0 && lost > 0) {
      const dailyRate = lost / daysTracking;
      weeklyRate = dailyRate * 7;
      
      if (dailyRate > 0 && remaining > 0) {
        projectedDays = Math.ceil(remaining / dailyRate);
        const date = new Date();
        date.setDate(date.getDate() + projectedDays);
        projectedDate = date.toISOString().split('T')[0];
      }
    }

    return { 
      lost, 
      remaining, 
      progressPercent, 
      weightTrend, 
      goal: WEIGHT_GOAL,
      startWeight,
      lowestWeight,
      highestWeight,
      daysTracking,
      weeklyChange,
      monthlyChange,
      bmi: latestStats?.bmi || 0,
      bodyFat: latestStats?.bodyFat || 0,
      water: latestStats?.water || 0,
      muscles: latestStats?.muscles || 0,
      bone: latestStats?.bone || 0,
      projectedDays,
      projectedDate,
      weeklyRate
    };
  }, [currentWeight, startWeight, chronoStats]);

  const unlockedTrophies = useMemo(() => {
    const unlocked: string[] = [];
    TROPHY_DEFINITIONS.forEach(t => {
      let current = 0;
      if (t.category === 'strength') {
        const exerciseLogs = logs.filter(l => {
          if (!l.exercise) return false;
          const ex = l.exercise.toLowerCase();
          const target = t.exercise?.toLowerCase() || '';
          
          if (ex === target) return true;
          if (target === 'barbell row' && (ex.includes('pendlay') || ex.includes('bb row') || ex.includes('barbell row'))) return true;
          if (target === "farmer's carry" && ex.includes('farmer')) return true;
          if (target === '1-arm dumbbell row' && (ex.includes('kroc') || ex.includes('dumbbell row') || ex.includes('db row'))) return true;
          if (target === 'inverted row' && ex.includes('inverted')) return true;
          
          return false;
        });
        
        const bodyWeight = dailyStats.length > 0 ? dailyStats[0].bodyWeight || 180 : 180;

        if (t.isRepsOnly) {
          current = exerciseLogs.reduce((max, l) => {
            const setMax = l.sets?.reduce((sMax, s) => Math.max(sMax, parseFloat(s.reps) || 0), 0) || 0;
            return Math.max(max, setMax);
          }, 0);
        } else if (t.minReps) {
          current = exerciseLogs.reduce((max, l) => {
            const setMax = l.sets?.reduce((sMax, s) => {
              const weight = parseFloat(s.weight) || 0;
              const reps = parseFloat(s.reps) || 0;
              return reps >= t.minReps ? Math.max(sMax, weight) : sMax;
            }, 0) || 0;
            return Math.max(max, setMax);
          }, 0);
        } else if (t.minDistance) {
          current = exerciseLogs.reduce((max, l) => {
            const setMax = l.sets?.reduce((sMax, s) => {
              const weight = parseFloat(s.weight) || 0;
              const distance = parseFloat(s.reps) || 0;
              return distance >= t.minDistance ? Math.max(sMax, weight) : sMax;
            }, 0) || 0;
            return Math.max(max, setMax);
          }, 0);
          if (t.isMultiplier) current = current / bodyWeight;
        } else if (t.isWeighted) {
          current = exerciseLogs.reduce((max, l) => {
            const setMax = l.sets?.reduce((sMax, s) => Math.max(sMax, parseFloat(s.weight) || 0), 0) || 0;
            return Math.max(max, setMax);
          }, 0);
        } else {
          let max1RM = 0;
          exerciseLogs.forEach(log => {
            if (log.sets) {
              log.sets.forEach(s => {
                const w = parseFloat(s.weight) || 0;
                const r = parseFloat(s.reps) || 0;
                if (w > 0 && r > 0) {
                  const est = s.estimated1RM || Math.round(w * (1 + r / 30));
                  max1RM = Math.max(max1RM, est);
                }
              });
            }
          });
          current = max1RM;
          if (t.isMultiplier) current = current / bodyWeight;
        }
      } else if (t.category === 'bjj') {
        if (t.metric === 'rounds') {
          current = bjj.maxRounds;
        } else if (t.metric === 'attendance') {
          current = bjj.totalClasses;
        }
      } else if (t.category === 'consistency') {
        current = totalWorkouts;
      } else if (t.category === 'recovery') {
        current = recoveryLogs.length;
      }

      if (current >= t.value) {
        unlocked.push(t.title);
      }
    });
    return unlocked;
  }, [deadlift, squat, bench, pullup, bjj, totalWorkouts, recoveryLogs, dailyStats, logs]);

  const trophyCount = unlockedTrophies.length;

  const bmr = profile ? calculateBMR(profile, currentWeight) : 2000;
  const tdee = profile ? calculateTDEE(bmr, profile.activityLevel) : 2500;

  return {
    totalWorkouts,
    strengthLogs,
    bjjLogs,
    totalBjjRounds,
    deadlift,
    squat,
    bench,
    pullup,
    bjj,
    currentWeight,
    weightLossStats,
    trainingLoadStats,
    calorieStats,
    recoveryStats,
    recommendedAction,
    trophyCount,
    unlockedTrophies,
    bmr,
    tdee
  };
}
