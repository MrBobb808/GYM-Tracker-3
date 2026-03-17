import React, { useMemo, useState, useEffect } from 'react';
import { 
  Activity, Scale, Flame, Target, TrendingUp, TrendingDown, 
  Users, Calendar, Moon, Zap, Trophy as TrophyIcon, 
  AlertCircle, ChevronRight, Dumbbell,
  Heart, Info, Clock, Timer, BookOpen, Lightbulb
} from 'lucide-react';
import { WorkoutLog, DailyStats, RecoveryLog, UserProfile } from '../types';
import { useMetrics } from '../hooks/useMetrics';
import { cn } from '../lib/utils';
import { WeightChart } from './WeightChart';
import QuestCard from './QuestCard';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, LineChart, Line
} from 'recharts';
import { WEIGHT_LOSS_TIPS, TROPHY_DEFINITIONS } from '../constants';

interface AnalyticsDashboardProps {
  logs: WorkoutLog[];
  dailyStats: DailyStats[];
  recoveryLogs: RecoveryLog[];
  profile: UserProfile | null;
  user: any;
  appId: string;
}

export default function AnalyticsDashboard({ logs, dailyStats, recoveryLogs, profile, user, appId }: AnalyticsDashboardProps) {
  const metrics = useMetrics(logs, dailyStats, recoveryLogs, profile);
  const [dailyTip, setDailyTip] = useState('');

  const userStatsForQuest = useMemo(() => {
    return {
      current_streak: metrics.bjj.attendanceRate > 0 ? 3 : 0, // Mock streak
      last_workout: logs[0] ? `${logs[0].type} - ${logs[0].phase}` : "None",
      bjj_status: `Attendance: ${metrics.bjj.attendanceRate}%. Avg rounds: ${metrics.bjj.avgRounds}.`,
      weight_trend: `${metrics.weightLossStats.weeklyChange > 0 ? "+" : ""}${metrics.weightLossStats.weeklyChange.toFixed(1)} lbs this week`,
      recovery_score: `${metrics.recoveryStats.currentScore}%`
    };
  }, [metrics, logs]);

  const existingAchievements = useMemo(() => {
    const base = metrics.unlockedTrophies;
    const dynamic = profile?.dynamicAchievements?.map(a => a.achievement_name) || [];
    return [...base, ...dynamic];
  }, [profile, metrics.unlockedTrophies]);

  useEffect(() => {
    const randomTip = WEIGHT_LOSS_TIPS[Math.floor(Math.random() * WEIGHT_LOSS_TIPS.length)];
    setDailyTip(randomTip);
  }, []);

  const currentXp = profile?.xp || 0;
  const currentLevel = profile?.level || 1;
  const xpForNextLevel = currentLevel * 1000;
  const xpProgress = ((currentXp % 1000) / 1000) * 100;

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-700">
      {/* RPG Progression Header */}
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-black/20">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center border-4 border-[#0D0D0D] shadow-lg shadow-amber-500/20">
            <span className="text-2xl font-black text-white">{currentLevel}</span>
          </div>
          <div>
            <div className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Forge Master Level</div>
            <h2 className="text-xl font-bold text-white">Level {currentLevel} Athlete</h2>
          </div>
        </div>
        <div className="flex-1 w-full">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2">
            <span className="text-zinc-500">XP Progress</span>
            <span className="text-amber-500">{currentXp} / {xpForNextLevel} XP</span>
          </div>
          <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000" 
              style={{ width: `${Math.min(xpProgress, 100)}%` }} 
            />
          </div>
        </div>
      </div>

      {/* 1. Daily Status Panel */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatusCard 
          icon={<Scale size={20} />} 
          label="Body Weight" 
          value={`${metrics.currentWeight} lbs`}
          trend={0}
          color="zinc"
        />
        <StatusCard 
          icon={<Heart size={20} />} 
          label="Recovery Score" 
          value={`${metrics.recoveryStats.currentScore}%`}
          trend={0}
          color={metrics.recoveryStats.currentScore >= 80 ? "emerald" : metrics.recoveryStats.currentScore >= 60 ? "amber" : "red"}
        />
        <StatusCard 
          icon={<Activity size={20} />} 
          label="Training Status" 
          value={metrics.trainingLoadStats.dailyLoad > 0 ? "Active" : "Rest Day"}
          color={metrics.trainingLoadStats.dailyLoad > 0 ? "blue" : "zinc"}
        />
        <StatusCard 
          icon={<Flame size={20} />} 
          label="Calories Remaining" 
          value={`${metrics.calorieStats.remaining} kcal`}
          color={metrics.calorieStats.remaining >= 0 ? "emerald" : "red"}
        />
      </section>

      {/* Forge Master Quest Card */}
      <QuestCard userStats={userStatsForQuest} existingAchievements={existingAchievements} user={user} appId={appId} profile={profile} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* 2. Weight Loss Tracker */}
        <DashboardCard title="Weight Loss Progress" icon={<Target size={18} />} className="lg:col-span-2">
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
              <StatMiniCard label="Current" value={metrics.currentWeight} unit="lbs" />
              <StatMiniCard label="Goal" value={metrics.weightLossStats.goal} unit="lbs" color="text-blue-400" />
              <StatMiniCard label="Lost" value={metrics.weightLossStats.lost.toFixed(1)} unit="lbs" color="text-emerald-400" />
              <StatMiniCard label="Remaining" value={metrics.weightLossStats.remaining.toFixed(1)} unit="lbs" color="text-orange-400" />
              <StatMiniCard label="Start" value={metrics.weightLossStats.startWeight} unit="lbs" />
              
              <StatMiniCard label="Lowest" value={metrics.weightLossStats.lowestWeight} unit="lbs" color="text-emerald-500" />
              <StatMiniCard label="Highest" value={metrics.weightLossStats.highestWeight} unit="lbs" color="text-red-400" />
              <StatMiniCard label="Days" value={metrics.weightLossStats.daysTracking} unit="days" />
              <StatMiniCard 
                label="Weekly" 
                value={(metrics.weightLossStats.weeklyChange > 0 ? "+" : "") + metrics.weightLossStats.weeklyChange.toFixed(1)} 
                unit="lbs" 
                color={metrics.weightLossStats.weeklyChange <= 0 ? "text-emerald-400" : "text-red-400"}
              />
              <StatMiniCard 
                label="Monthly" 
                value={(metrics.weightLossStats.monthlyChange > 0 ? "+" : "") + metrics.weightLossStats.monthlyChange.toFixed(1)} 
                unit="lbs" 
                color={metrics.weightLossStats.monthlyChange <= 0 ? "text-emerald-400" : "text-red-400"}
              />
              
              {metrics.weightLossStats.bmi > 0 && <StatMiniCard label="BMI" value={metrics.weightLossStats.bmi} unit="" color="text-zinc-300" />}
              {metrics.weightLossStats.bodyFat > 0 && <StatMiniCard label="Body Fat" value={metrics.weightLossStats.bodyFat} unit="%" color="text-orange-400" />}
              {metrics.weightLossStats.water > 0 && <StatMiniCard label="Water" value={metrics.weightLossStats.water} unit="%" color="text-blue-400" />}
              {metrics.weightLossStats.muscles > 0 && <StatMiniCard label="Muscles" value={metrics.weightLossStats.muscles} unit="%" color="text-emerald-400" />}
              {metrics.weightLossStats.bone > 0 && <StatMiniCard label="Bone" value={metrics.weightLossStats.bone} unit="%" color="text-zinc-400" />}
            </div>

            <div className="p-3 md:p-6 bg-white/5 rounded-2xl border border-white/10">
              <WeightChart data={dailyStats} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                <span className="text-zinc-500">Overall Progress</span>
                <span className="text-white">{metrics.weightLossStats.progressPercent}%</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-1000" 
                  style={{ width: `${metrics.weightLossStats.progressPercent}%` }} 
                />
              </div>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.weightLossStats.weightTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0D0D0D', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </DashboardCard>

        {/* 9. Daily Tip & Intelligence */}
        <div className="space-y-8">
          <DashboardCard title="Daily Tip" icon={<Lightbulb size={18} />} className="bg-gradient-to-br from-amber-600/10 to-transparent border-amber-500/20">
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10">
                  <Lightbulb size={40} />
                </div>
                <p className="text-sm font-medium text-amber-200 leading-relaxed italic">
                  "{dailyTip}"
                </p>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Intelligence" icon={<Zap size={18} />} className="bg-gradient-to-br from-blue-600/10 to-transparent border-blue-500/20">
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Recommended Action</div>
                <p className="text-sm font-medium text-white leading-relaxed">
                  {metrics.recommendedAction}
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Readiness</span>
                  <span className="text-white font-bold">{metrics.recoveryStats.currentScore}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-1000" 
                    style={{ width: `${metrics.recoveryStats.currentScore}%` }} 
                  />
                </div>
              </div>
            </div>
          </DashboardCard>

          {metrics.weightLossStats.projectedDays && (
            <DashboardCard title="Goal Prediction" icon={<Calendar size={18} />} className="bg-gradient-to-br from-emerald-600/10 to-transparent border-emerald-500/20">
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Projected Date</span>
                    <span className="text-lg font-black text-emerald-400">{new Date(metrics.weightLossStats.projectedDate!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Days Remaining</span>
                      <span className="text-sm font-bold text-white">{metrics.weightLossStats.projectedDays} days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Current Rate</span>
                      <span className="text-sm font-bold text-emerald-400">{metrics.weightLossStats.weeklyRate.toFixed(2)} lbs / week</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[10px] text-zinc-500 italic leading-relaxed">
                      * Based on your overall trend since {new Date(dailyStats[dailyStats.length - 1].date).toLocaleDateString()}. Consistency is key!
                    </p>
                  </div>
                </div>
              </div>
            </DashboardCard>
          )}

          <DashboardCard title="Metabolic Baseline" icon={<Clock size={18} />}>
            <div className="space-y-6">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">BMR</div>
                  <div className="text-2xl font-black text-white">{Math.round(metrics.bmr)}</div>
                  <div className="text-[10px] text-zinc-500">Basal Metabolic Rate</div>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                  <Activity size={20} />
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">TDEE</div>
                  <div className="text-2xl font-black text-emerald-400">{Math.round(metrics.tdee)}</div>
                  <div className="text-[10px] text-zinc-500">Total Daily Expenditure</div>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <Zap size={20} />
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 leading-relaxed italic">
                Your BMR is the energy burned at rest. TDEE includes your activity level. 
                Stay below TDEE to lose weight.
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* 2. Training Load Panel */}
        <DashboardCard title="Training Load" icon={<Target size={18} />}>
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-4xl font-black text-white">{metrics.trainingLoadStats.weeklyLoad}</div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">Weekly Load Score</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-zinc-400">Avg: {Math.round(metrics.trainingLoadStats.rollingAvgLoad)}</div>
                {metrics.trainingLoadStats.loadWarning && (
                  <div className="flex items-center gap-1 text-xs font-bold text-amber-500 mt-1">
                    <AlertCircle size={12} /> High Load Warning
                  </div>
                )}
              </div>
            </div>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={logs.slice(0, 14).reverse().map(l => ({ date: l.date, load: l.sessionLoad || 0 }))}>
                  <defs>
                    <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="date" hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0D0D0D', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#3b82f6' }}
                  />
                  <Area type="monotone" dataKey="load" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLoad)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </DashboardCard>

        {/* 3. Strength Progress Snapshot */}
        <DashboardCard title="Strength Snapshot" icon={<TrendingUp size={18} />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StrengthMiniCard label="Deadlift" value={metrics.deadlift.current1RM} unit="lbs" />
            <StrengthMiniCard label="Bench" value={metrics.bench.current1RM} unit="lbs" />
            <StrengthMiniCard label="Pull-Ups" value={metrics.pullup.current1RM} unit="lbs" />
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* 4. BJJ Performance Section */}
        <DashboardCard title="BJJ Performance" icon={<Users size={18} />}>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 md:p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-blue-400" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Attendance</span>
              </div>
              <div className="text-2xl font-black text-white">{metrics.bjj.attendanceRate}%</div>
              <div className="text-[10px] text-zinc-500 mt-1">{metrics.bjj.totalClasses} classes total</div>
            </div>
            <div className="p-3 md:p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Timer size={14} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Rolling Volume</span>
              </div>
              <div className="text-2xl font-black text-white">{metrics.bjj.avgRounds}</div>
              <div className="text-[10px] text-zinc-500 mt-1">avg rounds / session</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={14} className="text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Recent Technical Notes</span>
            </div>
            <div className="space-y-2">
              {metrics.bjjLogs.slice(0, 2).map(log => (
                <div key={log.id} className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-zinc-400">{log.date}</span>
                    <span className="text-[10px] font-bold text-blue-400">{log.rounds} Rounds</span>
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-2 italic leading-relaxed">
                    {log.notes || "No notes recorded."}
                  </p>
                </div>
              ))}
              {metrics.bjjLogs.length === 0 && (
                <div className="text-xs text-zinc-600 italic">No BJJ sessions logged yet.</div>
              )}
            </div>
          </div>
        </DashboardCard>

        {/* 5. Consistency Heatmap */}
        <DashboardCard title="Training Consistency" icon={<Calendar size={18} />}>
          <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
            {Array.from({ length: 90 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (89 - i));
              const dateStr = d.toISOString().split('T')[0];
              const hasWorkout = logs.some(l => l.date === dateStr);
              const load = logs.filter(l => l.date === dateStr).reduce((acc, l) => acc + (l.sessionLoad || 0), 0);
              
              return (
                <div 
                  key={i}
                  title={`${dateStr}: ${load} load`}
                  className={cn(
                    "w-3 h-3 rounded-sm transition-all duration-500",
                    !hasWorkout ? "bg-white/5" : 
                    load > 500 ? "bg-blue-500" :
                    load > 200 ? "bg-blue-500/60" : "bg-blue-500/30"
                  )}
                />
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-end gap-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-white/5" /> Rest</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-blue-500/30" /> Low</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-blue-500" /> High</div>
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
        {/* 6. Recovery Monitoring */}
        <DashboardCard title="Recovery Trend" icon={<Moon size={18} />}>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.recoveryStats.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="date" hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0D0D0D', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {metrics.recoveryStats.trend.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.score >= 80 ? '#10b981' : entry.score >= 60 ? '#f59e0b' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        {/* 7. Calorie Balance Panel */}
        <DashboardCard title="Calorie Balance" icon={<Flame size={18} />}>
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-black text-white">{metrics.calorieStats.consumed}</div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">In</div>
              </div>
              <div>
                <div className="text-xl font-black text-orange-400">{metrics.calorieStats.burned}</div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Out</div>
              </div>
              <div>
                <div className={cn("text-xl font-black", metrics.calorieStats.remaining >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {metrics.calorieStats.remaining}
                </div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Net</div>
              </div>
            </div>
            <div className="p-3 md:p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Weekly Deficit</div>
                <div className="text-lg font-black text-white">{metrics.calorieStats.weeklyDeficit} kcal</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Proj. Loss</div>
                <div className="text-lg font-black text-emerald-400">{metrics.calorieStats.projectedFatLoss} lbs</div>
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* 8. Achievements/Trophies */}
      <DashboardCard title="Recent Achievements" icon={<TrophyIcon size={18} />}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-3xl font-black text-white">{metrics.trophyCount}</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Trophies Unlocked</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-zinc-400">Total: {TROPHY_DEFINITIONS.length}</div>
            <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden mt-2">
              <div 
                className="h-full bg-amber-500 transition-all duration-1000" 
                style={{ width: `${(metrics.trophyCount / TROPHY_DEFINITIONS.length) * 100}%` }} 
              />
            </div>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {metrics.trophyCount > 0 ? (
            Array.from({ length: metrics.trophyCount }).slice(0, 5).map((_, i) => (
              <div key={i} className="shrink-0 w-32 p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <TrophyIcon size={20} />
                </div>
                <div className="text-[10px] font-black text-white uppercase tracking-tighter leading-tight">Achievement Unlocked</div>
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-600 italic">No achievements unlocked yet. Keep training.</div>
          )}
        </div>
      </DashboardCard>
    </div>
  );
}

function StatusCard({ icon, label, value, trend, color }: { icon: React.ReactNode, label: string, value: string, trend?: number, color: string }) {
  const colorClasses: Record<string, string> = {
    zinc: "text-zinc-400 bg-white/5",
    emerald: "text-emerald-400 bg-emerald-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    red: "text-red-400 bg-red-500/10",
    blue: "text-blue-400 bg-blue-500/10",
  };

  return (
    <div className="p-3 md:p-5 rounded-3xl bg-[#0D0D0D] border border-white/[0.04] flex flex-col justify-between space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-xl", colorClasses[color])}>
          {icon}
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={cn("flex items-center gap-1 text-[10px] font-bold", trend > 0 ? "text-emerald-500" : "text-red-500")}>
            {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-1">{label}</div>
        <div className="text-xl font-black text-white tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function DashboardCard({ title, icon, children, className }: { title: string, icon: React.ReactNode, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("p-4 md:p-6 rounded-2xl md:rounded-3xl bg-[#0D0D0D] border border-white/[0.04] flex flex-col hover:border-emerald-500/20 transition-all duration-300 group shadow-xl shadow-black/20", className)}>
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="p-2 bg-white/5 rounded-lg text-zinc-500 group-hover:text-emerald-400 transition-colors">
          {icon}
        </div>
        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-200 transition-colors">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function StrengthMiniCard({ label, value, unit }: { label: string, value: number, unit: string }) {
  return (
    <div className="p-3 md:p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-black text-white">{value}</span>
        <span className="text-[10px] font-bold text-zinc-600">{unit}</span>
      </div>
    </div>
  );
}

function StatMiniCard({ label, value, unit, color = "text-white" }: { label: string, value: string | number, unit: string, color?: string }) {
  return (
    <div className="p-3 md:p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={cn("text-lg font-black", color)}>{value}</span>
        <span className="text-[10px] font-bold text-zinc-600">{unit}</span>
      </div>
    </div>
  );
}
