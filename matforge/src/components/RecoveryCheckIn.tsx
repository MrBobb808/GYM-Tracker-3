import React, { useState } from 'react';
import { Moon, Zap, Activity, Brain, CheckCircle2, Loader2 } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { RECOVERY_METRICS } from '../constants';
import { RecoveryLog } from '../types';
import { cn } from '../lib/utils';

interface RecoveryCheckInProps {
  user: any;
  recoveryLogs: RecoveryLog[];
  appId: string;
}

export default function RecoveryCheckIn({ user, recoveryLogs, appId }: RecoveryCheckInProps) {
  const today = new Date().toISOString().split('T')[0];
  const existingLog = recoveryLogs.find(l => l.date === today);
  
  const [scores, setScores] = useState<Record<string, number>>({
    sleep: existingLog?.sleep || 3,
    energy: existingLog?.energy || 3,
    soreness: existingLog?.soreness || 3,
    stress: existingLog?.stress || 3,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const percentageScore = Math.round((totalScore / 20) * 100);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const logId = today;
      const logRef = doc(db, 'artifacts', appId, 'users', user.uid, 'recovery_logs', logId);
      
      const logData: RecoveryLog = {
        date: today,
        ...scores as any,
        score: percentageScore,
        timestamp: new Date().toISOString(),
      };
      
      await setDoc(logRef, logData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `artifacts/${appId}/users/${user.uid}/recovery_logs/${today}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = (id: string) => {
    switch(id) {
      case 'sleep': return <Moon size={20} />;
      case 'energy': return <Zap size={20} />;
      case 'soreness': return <Activity size={20} />;
      case 'stress': return <Brain size={20} />;
      default: return null;
    }
  };

  const getZoneColor = (score: number) => {
    if (score >= 4) return 'text-emerald-400';
    if (score >= 3) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Daily Recovery Check-In</h2>
        <p className="text-sm md:text-base text-zinc-500">Rate your physical and mental state to optimize your training intensity.</p>
      </div>

      <div className="grid gap-4 md:gap-6 mb-8 md:mb-10">
        {RECOVERY_METRICS.map((metric) => (
          <div key={metric.id} className="bg-white/[0.03] border border-white/10 p-4 md:p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg text-zinc-400">
                  {getIcon(metric.id)}
                </div>
                <span className="font-medium text-zinc-200">{metric.label}</span>
              </div>
              <span className="text-2xl font-bold text-white">{scores[metric.id]}</span>
            </div>
            
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={() => setScores(prev => ({ ...prev, [metric.id]: val }))}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold transition-all border",
                    scores[metric.id] === val 
                      ? "bg-white text-black border-white" 
                      : "bg-white/5 text-zinc-500 border-transparent hover:border-white/20"
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-2 px-1">
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">Poor</span>
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold">Excellent</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white/[0.03] border border-white/10 p-6 md:p-8 rounded-3xl text-center mb-8 md:mb-10">
        <div className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2">Readiness Score</div>
        <div className={cn("text-6xl font-black mb-4", 
          percentageScore >= 80 ? "text-emerald-400" : 
          percentageScore >= 60 ? "text-yellow-400" : "text-red-400"
        )}>
          {percentageScore}%
        </div>
        <div className="text-zinc-400 text-sm max-w-xs mx-auto">
          {percentageScore >= 80 ? (
            "High readiness. You're primed for a high-intensity session today."
          ) : percentageScore >= 60 ? (
            "Moderate readiness. Consider a balanced session or technical focus."
          ) : (
            "Low readiness. Consider active recovery or a lighter intensity today."
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all shadow-xl disabled:opacity-50"
      >
        {isSaving ? (
          <Loader2 className="animate-spin" size={20} />
        ) : showSuccess ? (
          <CheckCircle2 size={20} />
        ) : null}
        {showSuccess ? "Check-In Saved" : "Submit Daily Check-In"}
      </button>
    </div>
  );
}
