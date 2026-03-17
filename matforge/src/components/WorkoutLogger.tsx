import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, Scale, Flame, Target, ChevronRight, Loader2, CheckCircle2, Archive, Dumbbell, X, ChevronDown, ChevronUp, Swords, MessageSquare, Trophy as TrophyIcon } from 'lucide-react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { WORKOUT_PLAN, WEIGHT_GOAL } from '../constants';
import { WorkoutLog, DailyStats, SessionType, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { calculateBMR, calculateTDEE, calculateExerciseCalories } from '../lib/calories';
import { addXp, XP_REWARDS } from '../utils/xp';

interface WorkoutLoggerProps {
  user: any;
  logs: WorkoutLog[];
  dailyStats: DailyStats[];
  appId: string;
  profile: UserProfile | null;
}

export default function WorkoutLogger({ user, logs, dailyStats, appId, profile }: WorkoutLoggerProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionType, setSessionType] = useState<SessionType>('strength');
  const [selectedPhase, setSelectedPhase] = useState(Object.keys(WORKOUT_PLAN)[0]);
  const [selectedDay, setSelectedDay] = useState(Object.keys(WORKOUT_PLAN[selectedPhase as keyof typeof WORKOUT_PLAN])[0]);
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [bodyWeight, setBodyWeight] = useState('');
  const [syncStatus, setSyncStatus] = useState<'syncing' | 'saved' | 'error'>('saved'); 
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});
  const [prNotification, setPrNotification] = useState<{exercise: string, max: number} | null>(null);
  
  const isInitialLoad = useRef(true);
  const prTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const historicalMaxes = useMemo(() => {
    const maxes: Record<string, number> = {};
    logs.forEach(log => {
      if (log.type === 'strength' && log.exercise && log.date !== date) {
        const logMax = log.sets?.reduce((m, s) => Math.max(m, s.estimated1RM || 0), 0) || 0;
        maxes[log.exercise] = Math.max(maxes[log.exercise] || 0, logMax);
      }
    });
    return maxes;
  }, [logs, date]);

  useEffect(() => { 
    setSelectedDay(Object.keys(WORKOUT_PLAN[selectedPhase as keyof typeof WORKOUT_PLAN])[0]); 
  }, [selectedPhase]);

  useEffect(() => {
    const todaysLogs = logs.filter(l => l.date === date);
    const initialData: Record<string, any> = {};
    
    todaysLogs.forEach(log => {
      if (log.type === 'strength') {
        initialData[log.exercise!] = { 
          sets: log.sets,
          hardestPart: log.hardestPart,
          whatWentWell: log.whatWentWell,
          techniqueNotes: log.techniqueNotes
        };
      } else if (log.type === 'bjj') {
        initialData['bjj'] = {
          rounds: log.rounds,
          attendedClass: log.attendedClass,
          notes: log.notes
        };
      }
    });
    
    const todaysStats = dailyStats.find(s => s.date === date);
    setBodyWeight(todaysStats?.bodyWeight?.toString() || '');

    isInitialLoad.current = true; 
    setFormData(initialData);
    
    // Auto-expand exercises for the day
    const exercises = (WORKOUT_PLAN as any)[selectedPhase][selectedDay] || [];
    const initialExpanded: Record<string, boolean> = {};
    exercises.forEach((ex: any) => initialExpanded[ex.exercise] = true);
    setExpandedExercises(initialExpanded);
  }, [date, selectedDay, logs, dailyStats, selectedPhase]);

  const metrics = useMemo(() => {
    let completedSets = 0;
    let totalWeight = 0;
    
    Object.entries(formData).forEach(([key, data]: [string, any]) => {
      if (key !== 'bjj' && data.sets) {
        data.sets.forEach((s: any) => {
          if (s && s.weight && s.reps) {
            completedSets++;
            totalWeight += (parseFloat(s.weight) || 0) * (parseFloat(s.reps) || 0);
          }
        });
      }
    });

    const bjjRounds = formData.bjj?.rounds || 0;
    const strengthMinutes = completedSets * 3;
    const bjjMinutes = bjjRounds * 7;
    const activeMinutes = strengthMinutes + bjjMinutes;
    
    const currentWeightLbs = parseFloat(bodyWeight) || profile?.baseWeight || 180;
    const bmr = calculateBMR(profile || {}, currentWeightLbs);
    const baseCalories = Math.round(calculateTDEE(bmr, profile?.activityLevel));

    const strengthBurn = calculateExerciseCalories(bmr, strengthMinutes, 6.0);
    const bjjBurn = calculateExerciseCalories(bmr, bjjMinutes, 8.0);
    const burned = strengthBurn + bjjBurn;

    // Training Load Calculation
    // Load = (Weight * Reps) + (Sets * 10) + (BJJ Rounds * 50) + (Calories / 2)
    const loadScore = Math.round((totalWeight / 100) + (completedSets * 10) + (bjjRounds * 50) + (burned / 2));

    return { completedSets, activeMinutes, burned, totalAllowance: baseCalories + burned, loadScore, baseCalories };
  }, [formData, bodyWeight, profile]);

  const calculate1RM = (weight: number, reps: number) => {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
  };

  useEffect(() => {
    if (isInitialLoad.current) { isInitialLoad.current = false; return; }
    if (!user) return;

    setSyncStatus('syncing');
    
    const timer = setTimeout(async () => {
      try {
        if (sessionType === 'strength') {
          const exercises = (WORKOUT_PLAN as any)[selectedPhase][selectedDay] || [];
          for (const ex of exercises) {
            const data = formData[ex.exercise];
            if (data && data.sets) {
              const formattedSets = data.sets.map((s: any) => {
                const w = parseFloat(s.weight) || 0;
                const r = parseFloat(s.reps) || 0;
                const est1RM = calculate1RM(w, r);
                
                // PR Detection
                const prevMax = historicalMaxes[ex.exercise] || 0;
                
                if (est1RM > prevMax && est1RM > 0 && prevMax > 0) {
                  setPrNotification({ exercise: ex.exercise, max: est1RM });
                  if (prTimeoutRef.current) clearTimeout(prTimeoutRef.current);
                  prTimeoutRef.current = setTimeout(() => setPrNotification(null), 5000);
                }

                return { weight: s.weight || '', reps: s.reps || '', estimated1RM: est1RM };
              });

              const docId = `${date}_${ex.exercise.replace(/[^a-zA-Z0-9]/g, '')}`;
              await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', docId), {
                date, phase: selectedPhase, day: selectedDay, type: 'strength', exercise: ex.exercise, sets: formattedSets,
                hardestPart: data.hardestPart || '', whatWentWell: data.whatWentWell || '', techniqueNotes: data.techniqueNotes || '',
                sessionLoad: metrics.loadScore, caloriesBurned: metrics.burned, timestamp: new Date().toISOString()
              }, { merge: true });
            }
          }
        } else if (sessionType === 'bjj') {
          const data = formData.bjj;
          if (data) {
            const docId = `${date}_BJJ`;
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', docId), {
              date, phase: 'BJJ', day: 'Grappling', type: 'bjj',
              rounds: data.rounds || 0,
              attendedClass: data.attendedClass || false,
              notes: data.notes || '',
              sessionLoad: metrics.loadScore, caloriesBurned: metrics.burned,
              timestamp: new Date().toISOString()
            }, { merge: true });
          }
        }
        
        // Update Daily Stats and Award XP
        const dailyStatsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', `${date}_daily_stats`);
        const dailyStatsSnap = await getDoc(dailyStatsRef);
        const existingStats = dailyStatsSnap.exists() ? dailyStatsSnap.data() : {};
        const xpAwardedFor = existingStats.xpAwardedFor || {};
        
        let xpToAdd = 0;

        if (sessionType === 'weight' && bodyWeight && !xpAwardedFor.weightLogged) {
          xpToAdd += XP_REWARDS.LOG_WEIGHT;
          xpAwardedFor.weightLogged = true;
        }

        if (sessionType === 'strength') {
          if (!xpAwardedFor.strengthSession) {
            xpToAdd += XP_REWARDS.GYM_SESSION;
            xpAwardedFor.strengthSession = true;
          }
          
          if (!xpAwardedFor.prs) xpAwardedFor.prs = [];
          const exercises = (WORKOUT_PLAN as any)[selectedPhase][selectedDay] || [];
          for (const ex of exercises) {
            const data = formData[ex.exercise];
            if (data && data.sets) {
              const currentMax = data.sets.reduce((max: number, s: any) => Math.max(max, calculate1RM(parseFloat(s.weight) || 0, parseFloat(s.reps) || 0)), 0);
              const prevMax = historicalMaxes[ex.exercise] || 0;
              if (currentMax > 0 && prevMax > 0 && currentMax > prevMax) {
                if (!xpAwardedFor.prs.includes(ex.exercise)) {
                  xpToAdd += XP_REWARDS.PERSONAL_BEST;
                  xpAwardedFor.prs.push(ex.exercise);
                }
              }
            }
          }
        }

        if (sessionType === 'bjj') {
          if (formData.bjj?.attendedClass && !xpAwardedFor.bjjClass) {
            xpToAdd += XP_REWARDS.BJJ_ATTENDANCE;
            xpAwardedFor.bjjClass = true;
          }
          const currentRounds = formData.bjj?.rounds || 0;
          const awardedRounds = xpAwardedFor.bjjRounds || 0;
          if (currentRounds > awardedRounds) {
            xpToAdd += (currentRounds - awardedRounds) * XP_REWARDS.ROUND_ROLLED;
            xpAwardedFor.bjjRounds = currentRounds;
          }
        }

        if (xpToAdd > 0) {
          await addXp(user.uid, appId, xpToAdd);
        }

        await setDoc(dailyStatsRef, {
          isDailyStats: true, date, bodyWeight: parseFloat(bodyWeight) || null, caloriesBurned: metrics.burned, 
          baseCalories: metrics.baseCalories, trainingLoad: metrics.loadScore, timestamp: new Date().toISOString(),
          xpAwardedFor
        }, { merge: true });

        setSyncStatus('saved');
      } catch (error) { 
        handleFirestoreError(error, OperationType.WRITE, `artifacts/${appId}/users/${user.uid}/workout_logs`);
        setSyncStatus('error'); 
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData, bodyWeight, user, date, selectedPhase, selectedDay, metrics.burned, metrics.loadScore, appId, sessionType, logs]);

  const handleSetChange = (exerciseName: string, setIndex: number, field: string, value: string) => {
    setFormData(prev => {
      const exerciseData = prev[exerciseName] || { sets: [] };
      const newSets = [...(exerciseData.sets || [])];
      if (!newSets[setIndex]) newSets[setIndex] = { weight: '', reps: '' };
      newSets[setIndex] = { ...newSets[setIndex], [field]: value };
      return { ...prev, [exerciseName]: { ...exerciseData, sets: newSets } };
    });
  };

  const handleBjjChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      bjj: { ...(prev.bjj || {}), [field]: value }
    }));
  };

  const handleReflectionChange = (key: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: { ...(prev[key] || {}), [field]: value }
    }));
  };

  const toggleExpand = (exerciseName: string) => {
    setExpandedExercises(prev => ({ ...prev, [exerciseName]: !prev[exerciseName] }));
  };

  const triggerCSVDownload = (logs: WorkoutLog[]) => {
    if (logs.length === 0) { alert("No data available to export."); return; }
    const headers = ['Date', 'Type', 'Phase', 'Day', 'Exercise', 'Sets/Rounds', 'Load', 'Notes'];
    const rows = logs.map(log => {
      let detailStr = "";
      if (log.type === 'strength' && log.sets) {
        detailStr = log.sets.map((s, idx) => `S${idx+1}: ${s.weight}lbs x ${s.reps}`).join(' | ');
      } else if (log.type === 'bjj') {
        detailStr = `${log.rounds} rounds | ${log.attendedClass ? 'Attended Class' : 'No Class'}`;
      }
      return [
        log.date, 
        log.type, 
        `"${log.phase}"`, 
        `"${log.day}"`, 
        `"${log.exercise || 'BJJ'}"`, 
        `"${detailStr}"`, 
        log.sessionLoad, 
        `"${log.notes || log.techniqueNotes || ''}"`
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MatForge_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in duration-500 flex flex-col min-h-full relative">
      {/* PR Notification */}
      {prNotification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top bounce-in duration-700">
          <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black px-8 py-4 rounded-[2rem] shadow-[0_20px_50px_rgba(245,158,11,0.4)] flex items-center gap-4 font-black border-4 border-white/20">
            <div className="bg-black/10 p-2 rounded-full animate-bounce">
              <TrophyIcon size={32} />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-70 mb-0.5">Personal Record Shattered</div>
              <div className="text-lg tracking-tight">{prNotification.exercise}: {prNotification.max} lbs</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4 md:mb-8">
        <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-lg shadow-black/20 backdrop-blur-sm">
          <button 
            onClick={() => setSessionType('strength')}
            className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300", sessionType === 'strength' ? "bg-white text-black shadow-xl" : "text-zinc-500 hover:text-zinc-300")}
          >
            Strength
          </button>
          <button 
            onClick={() => setSessionType('bjj')}
            className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300", sessionType === 'bjj' ? "bg-white text-black shadow-xl" : "text-zinc-500 hover:text-zinc-300")}
          >
            BJJ
          </button>
          <button 
            onClick={() => setSessionType('weight')}
            className={cn("px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300", sessionType === 'weight' ? "bg-white text-black shadow-xl" : "text-zinc-500 hover:text-zinc-300")}
          >
            Weight
          </button>
        </div>
        <div className="flex items-center gap-4">
          {syncStatus === 'syncing' && <span className="flex items-center gap-2 text-xs font-medium text-zinc-400"><Loader2 size={12} className="animate-spin" /> Syncing...</span>}
          {syncStatus === 'saved' && <span className="flex items-center gap-2 text-xs font-medium text-zinc-500"><CheckCircle2 size={12} /> Auto-Saved</span>}
          {syncStatus === 'error' && <span className="flex items-center gap-2 text-xs font-medium text-red-500"><X size={12} /> Sync Error</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-10 border-b border-white/5 pb-4 md:pb-8">
        <div className="group">
          <label className="block text-xs font-semibold tracking-wider text-zinc-500 mb-2 uppercase">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent border-b border-zinc-800 focus:border-white text-white py-2 outline-none transition-colors appearance-none" />
        </div>
        {sessionType === 'strength' && (
          <>
            <div className="group">
              <label className="block text-xs font-semibold tracking-wider text-zinc-500 mb-2 uppercase">Training Phase</label>
              <select value={selectedPhase} onChange={(e) => setSelectedPhase(e.target.value)} className="w-full bg-transparent border-b border-zinc-800 focus:border-white text-white py-2 outline-none transition-colors appearance-none">
                {Object.keys(WORKOUT_PLAN).map(phase => <option key={phase} value={phase} className="bg-zinc-900">{phase}</option>)}
              </select>
            </div>
            <div className="group">
              <label className="block text-xs font-semibold tracking-wider text-zinc-500 mb-2 uppercase">Workout Day</label>
              <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} className="w-full bg-transparent border-b border-zinc-800 focus:border-white text-white py-2 outline-none transition-colors appearance-none">
                {Object.keys(WORKOUT_PLAN[selectedPhase as keyof typeof WORKOUT_PLAN] || {}).map(day => <option key={day} value={day} className="bg-zinc-900">{day}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      <div className="mb-6 md:mb-10 p-4 md:p-6 rounded-2xl bg-gradient-to-br from-zinc-900 to-[#0A0A0A] border border-white/5 shadow-inner">
        <h3 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-4 md:mb-6"><Activity size={16}/> Session Intelligence</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1.5"><Flame size={14}/> Calories Burned</span>
            <div className="flex items-baseline gap-2"><span className="text-3xl font-light text-orange-400">{metrics.burned}</span><span className="text-sm text-zinc-500 font-medium">kcal</span></div>
          </div>
          <div className="flex flex-col border-l border-zinc-800 pl-4 md:pl-8">
            <span className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1.5"><Target size={14}/> Training Load</span>
            <div className="flex items-baseline gap-2"><span className="text-3xl font-light text-blue-400">{metrics.loadScore}</span><span className="text-sm text-zinc-500 font-medium">score</span></div>
          </div>
          <div className="flex flex-col border-l border-zinc-800 pl-4 md:pl-8">
            <span className="text-xs font-medium text-zinc-500 mb-2 flex items-center gap-1.5"><Target size={14}/> Daily Allowance</span>
            <div className="flex items-baseline gap-2"><span className="text-3xl font-light text-white">{metrics.totalAllowance}</span><span className="text-sm text-zinc-500 font-medium">kcal</span></div>
          </div>
        </div>
      </div>

      {sessionType === 'strength' ? (
        <div className="space-y-6 flex-grow">
          <h3 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
             {selectedDay.split(':')[0]} <ChevronRight size={18} className="text-zinc-700"/> <span className="text-zinc-400 text-sm font-normal tracking-wide">{selectedDay.split(':')[1]}</span>
          </h3>
          
          {((WORKOUT_PLAN as any)[selectedPhase][selectedDay] || []).map((ex: any, i: number) => {
            const isExpanded = expandedExercises[ex.exercise];
            const exerciseData = formData[ex.exercise] || {};
            const currentMax = exerciseData.sets?.reduce((max: number, s: any) => Math.max(max, calculate1RM(parseFloat(s.weight) || 0, parseFloat(s.reps) || 0)), 0) || 0;
            const prevMax = historicalMaxes[ex.exercise] || 0;
            const isPR = currentMax > 0 && prevMax > 0 && currentMax > prevMax;
            
            return (
              <div key={i} className="bg-[#0D0D0D] rounded-2xl border border-white/[0.04] overflow-hidden transition-all hover:border-white/10 group">
                <button 
                  onClick={() => toggleExpand(ex.exercise)}
                  className="w-full flex items-center justify-between p-4 md:p-6 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/5 rounded-lg text-zinc-500 group-hover:text-white transition-colors">
                      <Dumbbell size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-lg tracking-tight">{ex.exercise}</h4>
                      <p className="text-xs text-zinc-500 mt-1 font-medium tracking-wide uppercase">Target: {ex.target}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">Est. Max</div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-emerald-400">
                          {currentMax} lbs
                        </div>
                        {isPR && (
                          <div className="bg-amber-500/20 text-amber-400 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-amber-500/30 animate-pulse">
                            PR!
                          </div>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-zinc-600" /> : <ChevronDown size={20} className="text-zinc-600" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 md:px-6 pb-4 md:pb-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                      {Array.from({ length: ex.sets }).map((_, setIdx) => (
                        <div key={setIdx} className="flex items-center gap-3 bg-[#050505] px-4 py-3 rounded-xl border border-white/[0.03] focus-within:border-zinc-500 transition-colors">
                          <span className="text-xs text-zinc-600 font-bold uppercase w-6">S{setIdx + 1}</span>
                          <input type="number" placeholder="lbs" value={exerciseData.sets?.[setIdx]?.weight || ''} onChange={(e) => handleSetChange(ex.exercise, setIdx, 'weight', e.target.value)} className="w-full bg-transparent text-center text-white font-medium outline-none placeholder:text-zinc-800" />
                          <span className="text-zinc-700 font-light">×</span>
                          <input type="text" placeholder="reps" value={exerciseData.sets?.[setIdx]?.reps || ''} onChange={(e) => handleSetChange(ex.exercise, setIdx, 'reps', e.target.value)} className="w-full bg-transparent text-center text-white font-medium outline-none placeholder:text-zinc-800" />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                        <MessageSquare size={14} /> Post-Workout Reflection
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <textarea 
                          placeholder="What felt hardest today?"
                          value={exerciseData.hardestPart || ''}
                          onChange={(e) => handleReflectionChange(ex.exercise, 'hardestPart', e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-sm text-zinc-300 outline-none focus:border-white/20 h-20 resize-none"
                        />
                        <textarea 
                          placeholder="What went well?"
                          value={exerciseData.whatWentWell || ''}
                          onChange={(e) => handleReflectionChange(ex.exercise, 'whatWentWell', e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-sm text-zinc-300 outline-none focus:border-white/20 h-20 resize-none"
                        />
                      </div>
                      <textarea 
                        placeholder="Technique notes & cues..."
                        value={exerciseData.techniqueNotes || ''}
                        onChange={(e) => handleReflectionChange(ex.exercise, 'techniqueNotes', e.target.value)}
                        className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-3 text-sm text-zinc-300 outline-none focus:border-white/20 h-20 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : sessionType === 'bjj' ? (
        <div className="space-y-8 flex-grow">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
              <Swords size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">BJJ Training Session</h3>
              <p className="text-zinc-500">Track rounds, attendance, and session notes.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white/[0.03] border border-white/10 p-4 md:p-6 rounded-2xl">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Rounds Rolled</label>
                <div className="flex items-center gap-4 md:gap-6">
                  <input 
                    type="range" min="0" max="20" step="1"
                    value={formData.bjj?.rounds || 0}
                    onChange={(e) => handleBjjChange('rounds', parseInt(e.target.value))}
                    className="flex-grow accent-white"
                  />
                  <span className="text-2xl md:text-3xl font-black text-white w-10 md:w-12 text-center">{formData.bjj?.rounds || 0}</span>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/10 p-4 md:p-6 rounded-2xl flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Class Attendance</label>
                  <p className="text-sm text-zinc-400">Did you attend a structured class?</p>
                </div>
                <button 
                  onClick={() => handleBjjChange('attendedClass', !formData.bjj?.attendedClass)}
                  className={cn(
                    "w-14 h-8 rounded-full transition-all relative",
                    formData.bjj?.attendedClass ? "bg-emerald-500" : "bg-zinc-800"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-6 h-6 bg-white rounded-full transition-all",
                    formData.bjj?.attendedClass ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <MessageSquare size={14} /> Session Notes
              </div>
              <textarea 
                placeholder="What did you work on today? Any specific techniques or rolls to remember?"
                value={formData.bjj?.notes || ''}
                onChange={(e) => handleBjjChange('notes', e.target.value)}
                className="w-full bg-white/[0.02] border border-white/5 rounded-xl p-4 text-sm text-zinc-300 outline-none focus:border-white/20 h-[210px] resize-none"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8 flex-grow animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
              <Scale size={28} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Body Weight Tracking</h3>
              <p className="text-zinc-500">Update your current weight for accurate metrics.</p>
            </div>
          </div>

          <div className="max-w-md mx-auto bg-white/[0.03] border border-white/10 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center space-y-8">
            <div className="space-y-2">
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">Current Weight</label>
              <div className="flex items-baseline justify-center gap-2">
                <input 
                  type="number" 
                  placeholder="000.0" 
                  value={bodyWeight} 
                  onChange={(e) => setBodyWeight(e.target.value)} 
                  className="text-7xl font-black text-white bg-transparent border-none outline-none placeholder:text-zinc-800 w-48 text-center" 
                />
                <span className="text-2xl font-bold text-zinc-600">lbs</span>
              </div>
            </div>
            
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <div className="grid grid-cols-2 gap-8 w-full">
              <div>
                <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Last Recorded</div>
                <div className="text-lg font-bold text-zinc-300">
                  {dailyStats.length > 0 ? dailyStats.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].bodyWeight : '--'} lbs
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Target</div>
                <div className="text-lg font-bold text-emerald-400">{WEIGHT_GOAL} lbs</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-white/5 flex justify-center">
        <button onClick={() => triggerCSVDownload(logs)} className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl font-semibold transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]">
          <Archive size={20} /> End Session & Download Backup CSV
        </button>
      </div>

    </div>
  );
}
