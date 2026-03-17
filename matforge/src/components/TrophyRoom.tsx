import React, { useMemo, useState, useEffect } from 'react';
import { Trophy as TrophyIcon, Lock, CheckCircle2, Star, Zap, Users, Dumbbell, Heart, Flame, Loader2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { WorkoutLog, DailyStats, RecoveryLog, UserProfile } from '../types';
import { TROPHY_DEFINITIONS } from '../constants';
import { useMetrics } from '../hooks/useMetrics';
import { cn } from '../lib/utils';
import { addXp, XP_REWARDS } from '../utils/xp';

interface TrophyRoomProps {
  user: any;
  appId: string;
  profile: UserProfile | null;
  logs: WorkoutLog[];
  dailyStats: DailyStats[];
  recoveryLogs: RecoveryLog[];
}

export default function TrophyRoom({ user, appId, profile, logs, dailyStats, recoveryLogs }: TrophyRoomProps) {
  const metrics = useMetrics(logs, dailyStats, recoveryLogs, profile);
  const [isUpdatingRank, setIsUpdatingRank] = useState(false);

  const maxWeeklyRounds = useMemo(() => {
    const weeks: Record<string, number> = {};
    logs.forEach(log => {
      if (log.type === 'bjj' && log.rounds) {
        const d = new Date(log.date);
        const day = d.getDay() || 7; // 1-7 (Mon-Sun)
        d.setDate(d.getDate() - day + 1);
        const weekKey = d.toISOString().split('T')[0];
        weeks[weekKey] = (weeks[weekKey] || 0) + log.rounds;
      }
    });
    const vals = Object.values(weeks);
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [logs]);

  const hasPromotion = (profile?.bjjBelt && profile.bjjBelt !== 'White') || (profile?.bjjStripes && profile.bjjStripes > 0);

  const handleRankUpdate = async (belt: string, stripes: number) => {
    setIsUpdatingRank(true);
    try {
      let xpToAdd = 0;
      if (belt !== currentBelt) xpToAdd += XP_REWARDS.BELT_EARNED;
      if (stripes > currentStripes) xpToAdd += XP_REWARDS.STRIPE_EARNED * (stripes - currentStripes);

      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), {
        bjjBelt: belt,
        bjjStripes: stripes
      }, { merge: true });

      if (xpToAdd > 0) {
        await addXp(user.uid, appId, xpToAdd);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `artifacts/${appId}/users/${user.uid}/profile`);
    } finally {
      setIsUpdatingRank(false);
    }
  };

  const currentBelt = profile?.bjjBelt || 'White';
  const currentStripes = profile?.bjjStripes || 0;
  const BELTS = ['White', 'Blue', 'Purple', 'Brown', 'Black'];

  const trophies = useMemo(() => {
    return TROPHY_DEFINITIONS.map(t => {
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
          current = metrics.bjj.maxRounds;
        } else if (t.metric === 'attendance') {
          current = metrics.bjj.totalClasses;
        } else if (t.metric === 'weekly_rounds') {
          current = maxWeeklyRounds;
        } else if (t.metric === 'promotion') {
          current = hasPromotion ? 1 : 0;
        }
      } else if (t.category === 'consistency') {
        current = metrics.totalWorkouts;
      } else if (t.category === 'recovery') {
        current = recoveryLogs.length;
      }

      const isUnlocked = current >= t.value;
      const progress = Math.min(100, (current / t.value) * 100);

      return {
        ...t,
        current,
        isUnlocked,
        progress
      };
    });
  }, [metrics, logs, dailyStats, recoveryLogs, maxWeeklyRounds, hasPromotion]);

  // Check for newly unlocked trophies
  useEffect(() => {
    if (!profile) return;
    
    const previouslyUnlocked = profile.unlockedTrophies || [];
    const currentlyUnlocked = trophies.filter(t => t.isUnlocked).map(t => t.id);
    
    const newlyUnlocked = currentlyUnlocked.filter(id => !previouslyUnlocked.includes(id));
    
    if (newlyUnlocked.length > 0) {
      const awardTrophyXp = async () => {
        try {
          const xpToAdd = newlyUnlocked.length * XP_REWARDS.TROPHY_EARNED;
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), {
            unlockedTrophies: [...previouslyUnlocked, ...newlyUnlocked]
          }, { merge: true });
          
          await addXp(user.uid, appId, xpToAdd);
        } catch (error) {
          console.error("Failed to award trophy XP", error);
        }
      };
      awardTrophyXp();
    }
  }, [trophies, profile, appId, user.uid]);

  const categories = ['strength', 'bjj', 'consistency', 'recovery'];

  const unlockedCount = trophies.filter(t => t.isUnlocked).length;
  const totalCount = TROPHY_DEFINITIONS.length;
  const progressPercentage = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="space-y-6 md:space-y-12">
      {/* Hall of Accolades Card */}
      <div className="bg-[#1A1A1A] border border-zinc-800/50 rounded-2xl md:rounded-[2.5rem] p-4 md:p-12 shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-all duration-700" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-zinc-800/5 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 md:gap-12 relative z-10">
          <div className="text-center lg:text-left max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-4 md:mb-6">
              <Star size={10} fill="currentColor" /> Achievement Status
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tighter uppercase mb-4 leading-none">
              Hall of <span className="text-amber-500">Accolades</span>
            </h2>
            <p className="text-zinc-500 font-medium text-lg leading-relaxed">
              62 achievements to prove your mettle on the mat and in the rack.
            </p>
          </div>
          
          <div className="relative flex items-center justify-center">
            {/* Circular Progress Ring */}
            <div className="relative w-48 h-48 md:w-56 md:h-56">
              <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(245,158,11,0.1)]" viewBox="0 0 100 100">
                <circle
                  className="text-zinc-800/50"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                  r="42"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="text-amber-500 transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={`${progressPercentage * 2.63}, 263.89`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="42"
                  cx="50"
                  cy="50"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl md:text-5xl font-black text-zinc-100 tracking-tighter">
                  {unlockedCount}<span className="text-zinc-600 text-2xl md:text-3xl">/</span>{totalCount}
                </span>
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mt-1">Total Unlocked</span>
              </div>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center shadow-xl rotate-12 group-hover:rotate-0 transition-transform duration-500">
              <TrophyIcon className="text-amber-500" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* BJJ Rank Tracker */}
      <div className="bg-[#1A1A1A] border border-zinc-800/50 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center border border-white/5">
              <Users className="text-amber-400" size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Current Rank</h3>
              <p className="text-zinc-400">{currentBelt} Belt, {currentStripes} Stripe{currentStripes !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="space-y-1 flex-1 md:flex-none">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Belt</label>
              <select 
                value={currentBelt}
                onChange={(e) => handleRankUpdate(e.target.value, currentStripes)}
                disabled={isUpdatingRank}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 appearance-none"
              >
                {BELTS.map(b => <option key={b} value={b} className="bg-zinc-900">{b}</option>)}
              </select>
            </div>
            <div className="space-y-1 flex-1 md:flex-none">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Stripes</label>
              <select 
                value={currentStripes}
                onChange={(e) => handleRankUpdate(currentBelt, parseInt(e.target.value, 10))}
                disabled={isUpdatingRank}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 appearance-none"
              >
                {[0, 1, 2, 3, 4].map(s => <option key={s} value={s} className="bg-zinc-900">{s} Stripe{s !== 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>
        </div>
        
        {/* Belt Visualizer */}
        <div className="mt-6 h-12 w-full rounded-lg relative overflow-hidden flex" style={{
          backgroundColor: currentBelt.toLowerCase() === 'white' ? '#f4f4f5' : 
                           currentBelt.toLowerCase() === 'blue' ? '#3b82f6' : 
                           currentBelt.toLowerCase() === 'purple' ? '#a855f7' : 
                           currentBelt.toLowerCase() === 'brown' ? '#78350f' : '#000000',
          border: currentBelt.toLowerCase() === 'white' ? '1px solid #e4e4e7' : 'none'
        }}>
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-black flex items-center justify-end px-4 gap-2">
            <div className="w-4 h-full bg-red-600 absolute left-0" />
            {[...Array(currentStripes)].map((_, i) => (
              <div key={i} className="w-3 h-full bg-white z-10" />
            ))}
          </div>
        </div>
      </div>

      {categories.map(cat => (
        <section key={cat} className="space-y-6">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-[0.3em] flex items-center gap-3">
            <div className="h-px flex-1 bg-white/5" />
            {cat}
            <div className="h-px flex-1 bg-white/5" />
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {trophies.filter(t => t.category === cat).map(t => (
              <TrophyCard key={t.id} trophy={t} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TrophyCard({ trophy }: { trophy: any }) {
  const Icon = trophy.category === 'strength' ? Dumbbell :
               trophy.category === 'bjj' ? Users :
               trophy.category === 'consistency' ? Zap :
               trophy.category === 'recovery' ? Heart : Star;

  return (
    <div className={cn(
      "relative group p-4 md:p-6 rounded-2xl border transition-all duration-500",
      trophy.isUnlocked 
        ? "bg-[#1A1A1A] border-zinc-700/50 hover:border-amber-500/30 shadow-lg hover:shadow-amber-500/5" 
        : "bg-[#121212] border-zinc-800/50 opacity-70 grayscale"
    )}>
      {trophy.isUnlocked && (
        <div className="absolute -top-2 -right-2 bg-amber-500 text-zinc-900 p-1 rounded-full shadow-lg z-10">
          <CheckCircle2 size={14} strokeWidth={3} />
        </div>
      )}
      
      <div className="flex gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
          trophy.isUnlocked ? `bg-amber-500/10 text-amber-500` : "bg-zinc-800/50 text-zinc-600"
        )}>
          {trophy.isUnlocked ? <Icon size={24} strokeWidth={2.5} /> : <Lock size={20} />}
        </div>
        
        <div className="space-y-1 min-w-0">
          <h4 className="text-sm font-bold text-zinc-100 truncate">{trophy.title}</h4>
          <p className="text-[11px] text-zinc-400 leading-tight line-clamp-2">{trophy.desc}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
          <span className="text-zinc-500">Progress</span>
          <span className={trophy.isUnlocked ? "text-amber-500" : "text-zinc-500"}>
            {trophy.isUnlocked ? 'Unlocked' : `${Math.round(trophy.progress)}%`}
          </span>
        </div>
        <div className="h-1.5 bg-zinc-800/80 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-1000",
              trophy.isUnlocked ? "bg-amber-500" : "bg-zinc-600"
            )}
            style={{ width: `${trophy.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
