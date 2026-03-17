import React from 'react';
import { Users, Timer, Target, TrendingUp, Calendar, BookOpen } from 'lucide-react';
import { WorkoutLog, DailyStats, RecoveryLog, UserProfile } from '../types';
import { useMetrics } from '../hooks/useMetrics';

interface BJJPageProps {
  logs: WorkoutLog[];
  dailyStats: DailyStats[];
  recoveryLogs: RecoveryLog[];
  profile: UserProfile | null;
}

export default function BJJPage({ logs, dailyStats, recoveryLogs, profile }: BJJPageProps) {
  const { bjjLogs, bjj } = useMetrics(logs, dailyStats, recoveryLogs, profile);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            BJJ Performance <Users className="text-blue-400" size={24} />
          </h2>
          <p className="text-zinc-500 mt-1">Combat metrics and technical progression.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111111] border border-white/5 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Calendar size={20} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-400">Class Attendance</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{bjj.attendanceRate}%</span>
            <span className="text-sm text-zinc-500">({bjj.totalClasses} classes)</span>
          </div>
          <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${bjj.attendanceRate}%` }} />
          </div>
        </div>

        <div className="bg-[#111111] border border-white/5 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Timer size={20} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-400">Rolling Volume</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{bjj.avgRounds}</span>
            <span className="text-sm text-zinc-500">avg rounds / session</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">{bjj.totalRounds} total rounds logged</p>
        </div>

        <div className="bg-[#111111] border border-white/5 p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <TrendingUp size={20} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-400">Session Frequency</h3>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{bjjLogs.length}</span>
            <span className="text-sm text-zinc-500">total sessions</span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Keep the momentum going</p>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <BookOpen size={20} className="text-zinc-400" />
          Technical Notes History
        </h3>
        <div className="grid gap-4">
          {bjjLogs.length === 0 ? (
            <div className="p-12 text-center bg-[#111111] border border-white/5 rounded-2xl text-zinc-600">
              No BJJ sessions logged yet.
            </div>
          ) : (
            bjjLogs.map((log) => (
              <div key={log.id} className="bg-[#111111] border border-white/5 p-5 rounded-2xl hover:border-white/10 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">{log.date}</span>
                    {log.attendedClass && (
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase rounded-md border border-blue-500/20">
                        Class
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-zinc-500">{log.rounds} Rounds</span>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed italic">
                  {log.notes || "No notes recorded for this session."}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
