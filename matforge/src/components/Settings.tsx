import React, { useState, useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { UserProfile } from '../types';
import { Save, Loader2, User, Activity, Ruler, Scale, Calendar, HeartPulse, CheckCircle2 } from 'lucide-react';
import { calculateBMR, calculateTDEE } from '../lib/calories';
import { HealthKitService } from '../services/HealthKitService';
import { addXp, XP_REWARDS } from '../utils/xp';

interface SettingsProps {
  user: any;
  appId: string;
  profile: UserProfile | null;
  currentWeight: number;
}

export default function Settings({ user, appId, profile, currentWeight }: SettingsProps) {
  const [formData, setFormData] = useState<UserProfile>({
    baseWeight: profile?.baseWeight || currentWeight || 0,
    height: profile?.height || 70,
    gender: profile?.gender || 'male',
    age: profile?.age || 30,
    activityLevel: profile?.activityLevel || 'moderate',
    macroSplitPreference: profile?.macroSplitPreference || 'balanced',
    healthKitConnected: profile?.healthKitConnected || false,
  });
  const [localCurrentWeight, setLocalCurrentWeight] = useState(currentWeight || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isConnectingHealth, setIsConnectingHealth] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        baseWeight: profile.baseWeight || currentWeight || 0,
        height: profile.height || 70,
        gender: profile.gender || 'male',
        age: profile.age || 30,
        activityLevel: profile.activityLevel || 'moderate',
        macroSplitPreference: profile.macroSplitPreference || 'balanced',
        healthKitConnected: profile.healthKitConnected || false,
      });
    }
    setLocalCurrentWeight(currentWeight || 0);
  }, [profile, currentWeight]);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConnectHealthKit = async () => {
    setIsConnectingHealth(true);
    try {
      const success = await HealthKitService.connect();
      if (success) {
        setFormData(prev => ({ ...prev, healthKitConnected: true }));
        setSaveMessage('Apple Health connected successfully!');
      } else {
        setSaveMessage('Failed to connect Apple Health.');
      }
    } catch (error) {
      console.error(error);
      setSaveMessage('Error connecting Apple Health.');
    } finally {
      setIsConnectingHealth(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      // Save profile data
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), {
        ...formData,
        hasCompletedOnboarding: true,
      }, { merge: true });

      // If current weight changed, save it as a daily stat for today
      if (localCurrentWeight !== currentWeight) {
        const today = new Date().toISOString().split('T')[0];
        const dailyStatsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', `${today}_daily_stats`);
        const dailyStatsDoc = await getDoc(dailyStatsRef);
        const dailyStatsData = dailyStatsDoc.exists() ? dailyStatsDoc.data() : {};
        const xpAwardedFor = dailyStatsData.xpAwardedFor || {};

        if (!xpAwardedFor.weight) {
          await addXp(user.uid, appId, XP_REWARDS.LOG_WEIGHT);
          xpAwardedFor.weight = true;
        }

        await setDoc(dailyStatsRef, {
          isDailyStats: true,
          date: today,
          bodyWeight: localCurrentWeight,
          timestamp: new Date().toISOString(),
          xpAwardedFor
        }, { merge: true });
      }

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `artifacts/${appId}/users/${user.uid}/profile`);
      setSaveMessage('Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const bmr = calculateBMR(formData, localCurrentWeight);
  const tdee = calculateTDEE(bmr, formData.activityLevel);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <User className="text-amber-400" size={32} /> Profile Settings
          </h2>
          <p className="text-sm md:text-base text-zinc-500 mt-1">Update your biometrics for accurate calorie and metabolic tracking.</p>
        </div>
      </div>

      <div className="bg-[#0D0D0D] border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-8 space-y-6 md:space-y-8 shadow-xl shadow-black/20">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Base Weight */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Scale size={14} /> Starting Weight (lbs)
            </label>
            <input
              type="number"
              value={formData.baseWeight || ''}
              onChange={(e) => handleChange('baseWeight', parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Current Weight */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Scale size={14} className="text-emerald-400" /> Current Weight (lbs)
            </label>
            <input
              type="number"
              value={localCurrentWeight || ''}
              onChange={(e) => setLocalCurrentWeight(parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-emerald-500/30 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Height */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Ruler size={14} /> Height (inches)
            </label>
            <input
              type="number"
              value={formData.height || ''}
              onChange={(e) => handleChange('height', parseFloat(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Age */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} /> Age
            </label>
            <input
              type="number"
              value={formData.age || ''}
              onChange={(e) => handleChange('age', parseInt(e.target.value, 10))}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <User size={14} /> Gender
            </label>
            <select
              value={formData.gender || 'male'}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
            >
              <option value="male" className="bg-zinc-900">Male</option>
              <option value="female" className="bg-zinc-900">Female</option>
            </select>
          </div>

          {/* Activity Level */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} /> Activity Level
            </label>
            <select
              value={formData.activityLevel || 'moderate'}
              onChange={(e) => handleChange('activityLevel', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
            >
              <option value="sedentary" className="bg-zinc-900">Sedentary (Little to no exercise)</option>
              <option value="light" className="bg-zinc-900">Lightly Active (1-3 days/week)</option>
              <option value="moderate" className="bg-zinc-900">Moderately Active (3-5 days/week)</option>
              <option value="very" className="bg-zinc-900">Very Active (6-7 days/week)</option>
              <option value="extra" className="bg-zinc-900">Extra Active (Very hard exercise/physical job)</option>
            </select>
          </div>

          {/* Macro Split Preference */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} className="text-amber-400" /> Macro Preference
            </label>
            <select
              value={formData.macroSplitPreference || 'balanced'}
              onChange={(e) => handleChange('macroSplitPreference', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-amber-500/50 transition-colors appearance-none"
            >
              <option value="balanced" className="bg-zinc-900">Balanced (30P / 40C / 30F)</option>
              <option value="high-protein" className="bg-zinc-900">High Protein (40P / 30C / 30F)</option>
              <option value="low-carb" className="bg-zinc-900">Low Carb (35P / 20C / 45F)</option>
            </select>
          </div>
        </div>

        {/* HealthKit Integration */}
        <div className="p-6 bg-[#1a1a1a] border border-white/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
              <HeartPulse size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Apple Health Integration</h3>
              <p className="text-sm text-zinc-400 max-w-md">
                Sync Active Energy, Resting Heart Rate, HRV, and Sleep data automatically to dynamically adjust your daily macro targets.
              </p>
            </div>
          </div>
          <button
            onClick={handleConnectHealthKit}
            disabled={isConnectingHealth || formData.healthKitConnected}
            className={`shrink-0 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
              formData.healthKitConnected 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'bg-white text-black hover:bg-zinc-200'
            }`}
          >
            {isConnectingHealth ? (
              <Loader2 className="animate-spin" size={18} />
            ) : formData.healthKitConnected ? (
              <><CheckCircle2 size={18} /> Connected</>
            ) : (
              'Connect Health'
            )}
          </button>
        </div>

        {/* Metabolic Summary */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Metabolic Profile</div>
            <div className="text-sm text-zinc-400">Based on Mifflin-St Jeor Equation</div>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-black text-white">{Math.round(bmr)}</div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">BMR (kcal)</div>
            </div>
            <div>
              <div className="text-2xl font-black text-emerald-400">{Math.round(tdee)}</div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">TDEE (kcal)</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-sm font-medium text-emerald-400">{saveMessage}</div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-amber-500 text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Save Profile
          </button>
        </div>

      </div>
    </div>
  );
}
