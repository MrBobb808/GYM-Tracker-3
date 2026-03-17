import React, { useState, useEffect } from 'react';
import { Shield, Sword, Scroll, Loader2, Sparkles, AlertTriangle, CheckCircle, Plus, Trophy } from 'lucide-react';
import { ForgeMasterResponse, UserProfile } from '../types';
import { ForgeMasterService } from '../services/ForgeMasterService';
import { doc, setDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import confetti from 'canvas-confetti';

interface QuestCardProps {
  userStats: any;
  existingAchievements: string[];
  user: any;
  appId: string;
  profile: UserProfile | null;
}

export default function QuestCard({ userStats, existingAchievements, user, appId, profile }: QuestCardProps) {
  const [response, setResponse] = useState<ForgeMasterResponse | null>(profile?.activeQuest || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isAccepted, setIsAccepted] = useState<boolean>(!!profile?.activeQuest);

  useEffect(() => {
    if (profile?.activeQuest) {
      setResponse(profile.activeQuest);
      setIsAccepted(true);
    }
  }, [profile?.activeQuest]);

  const generateQuest = async () => {
    setIsGenerating(true);
    setError('');
    try {
      if (!window.aistudio?.hasSelectedApiKey) {
        throw new Error("API Key selection not available.");
      }
      
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
      }

      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key is missing. Please select one.");
      }

      const currentInventory = profile?.inventory || [];
      const newResponse = await ForgeMasterService.generateQuest(apiKey, userStats, existingAchievements, currentInventory);
      setResponse(newResponse);
      setIsAccepted(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate quest. The Forge Master is resting.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptQuest = async () => {
    if (!response) return;
    setIsSaving(true);
    try {
      // Add the new achievement to the user's profile as a locked achievement
      const currentAchievements = profile?.dynamicAchievements || [];
      const newAchievement = { ...response.new_achievement_to_add, isUnlocked: false };
      
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), {
        activeQuest: response,
        dynamicAchievements: [...currentAchievements, newAchievement]
      }, { merge: true });
      setIsAccepted(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `artifacts/${appId}/users/${user.uid}/profile`);
      setError('Failed to accept quest.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteQuest = async () => {
    if (!response) return;
    setIsSaving(true);
    try {
      const questType = response.quest.quest_type;
      const xpReward = questType === 'Boss Fight' ? 500 : questType === 'Side Quest' ? 250 : 100;
      
      const currentXp = profile?.xp || 0;
      const newXp = currentXp + xpReward;
      const newLevel = Math.floor(newXp / 1000) + 1;
      
      const currentInventory = profile?.inventory || [];
      const newInventory = [...currentInventory, response.new_achievement_to_add.linked_item_reward.item_name];

      // Mark the achievement as unlocked
      const currentAchievements = profile?.dynamicAchievements || [];
      const updatedAchievements = currentAchievements.map(a => 
        a.achievement_name === response.new_achievement_to_add.achievement_name 
          ? { ...a, isUnlocked: true } 
          : a
      );

      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data'), {
        activeQuest: null,
        xp: newXp,
        level: newLevel,
        inventory: newInventory,
        dynamicAchievements: updatedAchievements
      }, { merge: true });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#3b82f6']
      });

      setResponse(null);
      setIsAccepted(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `artifacts/${appId}/users/${user.uid}/profile`);
      setError('Failed to complete quest.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!response && !isGenerating) {
    return (
      <div className="bg-[#141414] border border-amber-500/20 rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-red-500/5 opacity-50"></div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-amber-500/10 rounded-full text-amber-500">
            <Scroll size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-2">The Forge Master Awaits</h3>
            <p className="text-sm text-zinc-400 max-w-sm mx-auto">
              Consult the AI Dungeon Master for a personalized, dynamic quest based on your recent training data.
            </p>
          </div>
          <button
            onClick={generateQuest}
            className="mt-2 bg-amber-500 text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-400 transition-all"
          >
            <Sparkles size={18} />
            Consult the Forge Master
          </button>
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="bg-[#141414] border border-amber-500/20 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[250px]">
        <Loader2 className="animate-spin text-amber-500 mb-4" size={32} />
        <p className="text-amber-500/80 font-medium animate-pulse">The Forge Master is scrying your training logs...</p>
      </div>
    );
  }

  if (!response) return null;

  const { armory_summary, quest, new_achievement_to_add: achievement } = response;

  const getQuestIcon = () => {
    switch (quest.quest_type) {
      case 'Boss Fight': return <AlertTriangle className="text-red-500" size={24} />;
      case 'Side Quest': return <Sword className="text-blue-400" size={24} />;
      default: return <Shield className="text-emerald-400" size={24} />;
    }
  };

  const getQuestColor = () => {
    switch (quest.quest_type) {
      case 'Boss Fight': return 'border-red-500/30 bg-red-500/5';
      case 'Side Quest': return 'border-blue-500/30 bg-blue-500/5';
      default: return 'border-emerald-500/30 bg-emerald-500/5';
    }
  };

  const getQuestTextColor = () => {
    switch (quest.quest_type) {
      case 'Boss Fight': return 'text-red-500';
      case 'Side Quest': return 'text-blue-400';
      default: return 'text-emerald-400';
    }
  };

  const xpReward = quest.quest_type === 'Boss Fight' ? 500 : quest.quest_type === 'Side Quest' ? 250 : 100;

  return (
    <div className="space-y-4">
      {/* Armory Summary Section */}
      {armory_summary && (
        <div className="bg-[#141414] border border-amber-500/20 rounded-2xl p-4 flex items-start gap-4">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 shrink-0">
            <Shield size={20} />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-1">Armory Summary</div>
            <p className="text-sm text-zinc-300 italic">"{armory_summary}"</p>
          </div>
        </div>
      )}

      {/* Quest Section */}
      <div className={`border rounded-2xl p-6 relative overflow-hidden ${getQuestColor()}`}>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-black/50 border border-white/5`}>
              {getQuestIcon()}
            </div>
            <div>
              <div className={`text-[10px] font-bold uppercase tracking-widest ${getQuestTextColor()}`}>
                {quest.quest_type}
              </div>
              <h3 className="text-xl font-black text-white">{quest.quest_title}</h3>
            </div>
          </div>
          <button 
            onClick={generateQuest}
            className="text-zinc-500 hover:text-amber-500 transition-colors"
            title="Reroll Quest"
          >
            <Sparkles size={16} />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-zinc-300 italic border-l-2 border-amber-500/30 pl-4 py-1">
            "{quest.lore_description}"
          </p>
        </div>

        <div className="bg-black/40 rounded-xl p-4 border border-white/5 mb-4">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Objective</div>
          <p className="text-white font-medium">{quest.real_world_objective}</p>
        </div>

        {/* New Achievement Discovered Section */}
        <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={16} className="text-amber-500" />
            <div className="text-xs font-bold text-amber-500 uppercase tracking-widest">New Achievement Discovered</div>
          </div>
          <h4 className="text-lg font-bold text-white mb-1">{achievement.achievement_name}</h4>
          <p className="text-sm text-zinc-400 mb-3">{achievement.unlock_condition}</p>
          
          <div className="flex items-center gap-3 bg-black/40 rounded-lg p-2 border border-white/5">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Linked Reward:</div>
            <div className="text-purple-400 font-bold text-sm truncate" title={achievement.linked_item_reward.item_name}>
              {achievement.linked_item_reward.item_name} <span className="text-zinc-500 font-normal">({achievement.linked_item_reward.item_type})</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 bg-black/40 rounded-xl p-3 border border-white/5 flex items-center gap-3">
            <div className="text-amber-400 font-black text-lg">+{xpReward}</div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">XP Reward</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-2">
          {!isAccepted ? (
            <button
              onClick={handleAcceptQuest}
              disabled={isSaving}
              className="flex-1 bg-amber-500 text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-400 transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
              Accept Quest
            </button>
          ) : (
            <button
              onClick={handleCompleteQuest}
              disabled={isSaving}
              className="flex-1 bg-emerald-500 text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              Complete Quest
            </button>
          )}
        </div>
        {error && <p className="text-red-400 text-xs mt-2 text-center">{error}</p>}
      </div>
    </div>
    </div>
  );
}
