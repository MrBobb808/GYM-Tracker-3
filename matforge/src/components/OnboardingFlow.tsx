import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { Loader2, ArrowRight, Scale, Ruler, User, Calendar, Activity } from 'lucide-react';
import { addXp, XP_REWARDS } from '../utils/xp';

interface OnboardingFlowProps {
  user: any;
  appId: string;
  onComplete: () => void;
}

export default function OnboardingFlow({ user, appId, onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => {
    if (step === 1 && !weight) return;
    if (step === 2 && !height) return;
    if (step === 3 && !age) return;
    setStep(s => s + 1);
  };

  const handleComplete = async () => {
    if (!weight || !height || !age) return;
    setIsSubmitting(true);
    try {
      // Save profile data
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), {
        hasCompletedOnboarding: true,
        baseWeight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age, 10),
        gender,
        activityLevel,
        onboardingDate: new Date().toISOString()
      }, { merge: true });

      // Save initial weight as a daily stat
      const today = new Date().toISOString().split('T')[0];
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', `${today}_daily_stats`), {
        isDailyStats: true,
        date: today,
        bodyWeight: parseFloat(weight) || 0,
        timestamp: new Date().toISOString(),
        xpAwardedFor: { weight: true }
      }, { merge: true });

      await addXp(user.uid, appId, XP_REWARDS.LOG_WEIGHT);

      onComplete();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `artifacts/${appId}/users/${user.uid}/profile`);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-200 font-sans p-4 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-zinc-800/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="max-w-md w-full bg-[#1A1A1A] border border-zinc-800/50 p-10 rounded-[2.5rem] shadow-2xl relative z-10">
        
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-black text-zinc-100 uppercase tracking-tighter">Welcome to MatForge</h2>
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Step {step} of 4</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-800/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-500" 
              style={{ width: `${(step / 4) * 100}%` }} 
            />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <label className="block text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Scale size={16} /> Current Weight (lbs)
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 185"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-xl focus:outline-none focus:border-amber-500/50 transition-colors"
                autoFocus
              />
            </div>
            <button 
              onClick={handleNext}
              disabled={!weight}
              className="w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <label className="block text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Ruler size={16} /> Height (inches)
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="e.g. 70"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-xl focus:outline-none focus:border-amber-500/50 transition-colors"
                autoFocus
              />
              <p className="text-xs text-zinc-500 mt-2">Example: 5'10" = 70 inches</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setStep(1)}
                className="px-6 py-4 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleNext}
                disabled={!height}
                className="flex-1 bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Calendar size={16} /> Age
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 30"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-xl focus:outline-none focus:border-amber-500/50 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <User size={16} /> Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-xl focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
                >
                  <option value="male" className="bg-zinc-900">Male</option>
                  <option value="female" className="bg-zinc-900">Female</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setStep(2)}
                className="px-6 py-4 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleNext}
                disabled={!age}
                className="flex-1 bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div>
              <label className="block text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Activity size={16} /> Activity Level
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-xl focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
              >
                <option value="sedentary" className="bg-zinc-900 text-sm">Sedentary (Little to no exercise)</option>
                <option value="light" className="bg-zinc-900 text-sm">Lightly Active (1-3 days/week)</option>
                <option value="moderate" className="bg-zinc-900 text-sm">Moderately Active (3-5 days/week)</option>
                <option value="very" className="bg-zinc-900 text-sm">Very Active (6-7 days/week)</option>
                <option value="extra" className="bg-zinc-900 text-sm">Extra Active (Very hard exercise)</option>
              </select>
              <p className="text-xs text-zinc-500 mt-2">This helps us calculate your baseline calorie burn accurately.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setStep(3)}
                className="px-6 py-4 rounded-xl font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Back
              </button>
              <button 
                onClick={handleComplete}
                disabled={isSubmitting}
                className="flex-1 bg-amber-500 text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Complete Setup"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
