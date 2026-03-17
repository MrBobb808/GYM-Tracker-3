import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Activity, Table2, PlusCircle, Trophy, Loader2, Timer, X, Play, Square, Archive, Users, Settings as SettingsIcon } from 'lucide-react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, onSnapshot, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './firebase';
import { WORKOUT_PLAN } from './constants';
import { WorkoutLog, DailyStats, RecoveryLog, UserProfile } from './types';
import WorkoutLogger from './components/WorkoutLogger';
import SpreadsheetView from './components/SpreadsheetView';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import RecoveryCheckIn from './components/RecoveryCheckIn';
import BJJPage from './components/BJJPage';
import TrophyRoom from './components/TrophyRoom';
import RestTimer from './components/RestTimer';
import ChatAssistant from './components/ChatAssistant';
import OnboardingFlow from './components/OnboardingFlow';
import Settings from './components/Settings';
import WeeklySummaryComponent from './components/WeeklySummary';
import { cn } from './lib/utils';
import firebaseConfig from '../firebase-applet-config.json';
import { LogIn, LogOut, Moon, Sparkles } from 'lucide-react';

const appId = firebaseConfig.appId.replace(/:/g, '_'); // Sanitize appId for path

export default function App() {
  const [activeTab, setActiveTab] = useState<'log' | 'spreadsheet' | 'analytics' | 'recovery' | 'trophies' | 'settings' | 'summary'>('analytics');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [recoveryLogs, setRecoveryLogs] = useState<RecoveryLog[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (!currentUser) {
        setIsDataLoading(false);
        setHasCompletedOnboarding(null);
        setLogs([]);
        setDailyStats([]);
        setRecoveryLogs([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  useEffect(() => {
    if (!user) return;
    setIsDataLoading(true);
    
    // Check onboarding status
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
    const unsubProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setHasCompletedOnboarding(!!data.hasCompletedOnboarding);
      } else {
        setProfile(null);
        setHasCompletedOnboarding(false);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `artifacts/${appId}/users/${user.uid}/profile/data`);
    });

    const logsCollectionRef = collection(db, 'artifacts', appId, 'users', user.uid, 'workout_logs');
    const recoveryCollectionRef = collection(db, 'artifacts', appId, 'users', user.uid, 'recovery_logs');

    const unsubLogs = onSnapshot(logsCollectionRef,
      (snapshot) => {
        const fetchedLogs: WorkoutLog[] = [];
        const fetchedStats: DailyStats[] = [];
        snapshot.docs.forEach(doc => {
          const data = { id: doc.id, ...doc.data() } as any;
          if (data.isDailyStats) fetchedStats.push(data);
          else fetchedLogs.push(data);
        });
        fetchedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        fetchedStats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setLogs(fetchedLogs);
        setDailyStats(fetchedStats);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `artifacts/${appId}/users/${user.uid}/workout_logs`);
      }
    );

    const unsubRecovery = onSnapshot(recoveryCollectionRef,
      (snapshot) => {
        const fetched: RecoveryLog[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecoveryLog));
        fetched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecoveryLogs(fetched);
        setIsDataLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `artifacts/${appId}/users/${user.uid}/recovery_logs`);
        setIsDataLoading(false);
      }
    );

    return () => {
      unsubProfile();
      unsubLogs();
      unsubRecovery();
    };
  }, [user]);

  // Seed initial weight data
  useEffect(() => {
    if (user && !isDataLoading) {
      const seedData = async () => {
        const initialWeights = [
          { date: '2026-02-19', time: '19:02', weight: 288.8, bmi: 38.2, bodyFat: 43, water: 33.4, muscles: 29.8, bone: 3.9 },
          { date: '2026-03-02', time: '18:20', weight: 292.4, bmi: 38.7 },
          { date: '2026-03-09', time: '18:21', weight: 287, bmi: 38 },
          { date: '2026-03-11', time: '06:19', weight: 282.4, bmi: 37.4 },
          { date: '2026-03-14', time: '10:49', weight: 284.4, bmi: 37.7 },
          { date: '2026-03-15', time: '07:51', weight: 283, bmi: 37.5 }
        ];

        for (const entry of initialWeights) {
          const docId = `${entry.date}_daily_stats`;
          // Use setDoc with merge: true to ensure we don't overwrite if user added more data to these days
          await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', docId), {
            isDailyStats: true,
            date: entry.date,
            time: entry.time,
            bodyWeight: entry.weight,
            bmi: entry.bmi,
            bodyFat: entry.bodyFat || null,
            water: entry.water || null,
            muscles: entry.muscles || null,
            bone: entry.bone || null,
            caloriesBurned: 0,
            baseCalories: 2500,
            trainingLoad: 0,
            timestamp: new Date(`${entry.date}T${entry.time}:00`).toISOString()
          }, { merge: true });
        }
      };
      
      // Force seed if the historical start date is missing, but ONLY for the original user
      const hasHistoricalData = dailyStats.some(s => s.date === '2026-02-19');
      if (!hasHistoricalData && user.email === 'kidace707@gmail.com') {
        seedData();
      }

      // Cleanup accidentally seeded data for other users
      if (hasHistoricalData && user.email !== 'kidace707@gmail.com') {
        const cleanupData = async () => {
          const seededDates = ['2026-02-19', '2026-03-02', '2026-03-09', '2026-03-11', '2026-03-14', '2026-03-15'];
          for (const date of seededDates) {
            const docId = `${date}_daily_stats`;
            try {
              await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', docId));
            } catch (e) {
              console.error("Cleanup failed", e);
            }
          }
        };
        cleanupData();
      }
    }
  }, [user, isDataLoading, dailyStats.length, appId]);

  if (isAuthLoading || (user && hasCompletedOnboarding === null)) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-zinc-300 space-y-4">
        <Loader2 className="animate-spin text-white" size={40} />
        <p className="text-sm font-medium animate-pulse">Syncing with Iron Cloud...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <Trophy className="text-amber-500 mx-auto mb-6" size={64} strokeWidth={2.5} />
          <h1 className="text-4xl font-black text-zinc-100 mb-4 tracking-tighter uppercase">MatForge</h1>
          <p className="text-zinc-500 mb-10 leading-relaxed font-medium">The ultimate strength and metabolic tracker for combat athletes. Sign in to forge your legacy.</p>
          <button 
            onClick={handleGoogleSignIn}
            className="w-full bg-zinc-100 text-zinc-900 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white transition-all shadow-xl shadow-amber-500/5"
          >
            <LogIn size={20} /> Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (hasCompletedOnboarding === false) {
    return <OnboardingFlow user={user} appId={appId} onComplete={() => setHasCompletedOnboarding(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-200 font-sans relative overflow-hidden selection:bg-amber-500/20">
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-zinc-800/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-zinc-900/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 md:px-8 h-16 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Trophy className="text-amber-500" size={24} strokeWidth={2.5} />
          <h1 className="text-xl font-black tracking-tighter text-zinc-100 uppercase">MatForge</h1>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/30">
          <NavTab active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<Activity size={16}/>} label="Dashboard" />
          <NavTab active={activeTab === 'summary'} onClick={() => setActiveTab('summary')} icon={<Sparkles size={16}/>} label="Weekly Summary" />
          <NavTab active={activeTab === 'trophies'} onClick={() => setActiveTab('trophies')} icon={<Trophy size={16}/>} label="Trophy Room" />
          <NavTab active={activeTab === 'log'} onClick={() => setActiveTab('log')} icon={<PlusCircle size={16}/>} label="Log Session" />
          <NavTab active={activeTab === 'recovery'} onClick={() => setActiveTab('recovery')} icon={<Moon size={16}/>} label="Recovery" />
          <NavTab active={activeTab === 'spreadsheet'} onClick={() => setActiveTab('spreadsheet')} icon={<Table2 size={16}/>} label="Data Sheet" />
          <NavTab active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={16}/>} label="Settings" />
        </div>

        <div className="flex items-center gap-4">
          <RestTimer variant="nav" />
          <ChatAssistant user={user} appId={appId} variant="nav" />
          <div className="hidden lg:flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-800/50 text-[10px] font-black text-zinc-500 uppercase tracking-widest shadow-inner">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Live
          </div>
          <button 
            onClick={handleSignOut}
            className="hidden md:block p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
          
          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <div className="space-y-1.5"><div className="w-6 h-0.5 bg-current" /><div className="w-6 h-0.5 bg-current" /><div className="w-6 h-0.5 bg-current" /></div>}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#121212]/95 backdrop-blur-2xl md:hidden pt-24 px-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <MobileNavTab active={activeTab === 'analytics'} onClick={() => { setActiveTab('analytics'); setIsMenuOpen(false); }} icon={<Activity size={20}/>} label="Dashboard" />
          <MobileNavTab active={activeTab === 'summary'} onClick={() => { setActiveTab('summary'); setIsMenuOpen(false); }} icon={<Sparkles size={20}/>} label="Weekly Summary" />
          <MobileNavTab active={activeTab === 'trophies'} onClick={() => { setActiveTab('trophies'); setIsMenuOpen(false); }} icon={<Trophy size={20}/>} label="Trophy Room" />
          <MobileNavTab active={activeTab === 'log'} onClick={() => { setActiveTab('log'); setIsMenuOpen(false); }} icon={<PlusCircle size={20}/>} label="Log Session" />
          <MobileNavTab active={activeTab === 'recovery'} onClick={() => { setActiveTab('recovery'); setIsMenuOpen(false); }} icon={<Moon size={20}/>} label="Recovery" />
          <MobileNavTab active={activeTab === 'spreadsheet'} onClick={() => { setActiveTab('spreadsheet'); setIsMenuOpen(false); }} icon={<Table2 size={20}/>} label="Data Sheet" />
          <MobileNavTab active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsMenuOpen(false); }} icon={<SettingsIcon size={20}/>} label="Settings" />
          <div className="mt-auto pb-12">
            <button 
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold uppercase tracking-widest"
            >
              <LogOut size={20} /> Sign Out
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto pt-16 md:pt-24 pb-4 md:pb-12 px-0 sm:px-4 md:px-8 relative z-10">
        <div className="bg-[#1A1A1A] rounded-none sm:rounded-[2rem] border-y sm:border border-zinc-800/50 p-3 md:p-8 shadow-2xl min-h-[600px]">
          {isDataLoading ? (
            <div className="flex flex-col items-center justify-center h-96 text-zinc-500 space-y-4">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-xs font-bold uppercase tracking-widest">Forging session data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'analytics' && <AnalyticsDashboard logs={logs} dailyStats={dailyStats} recoveryLogs={recoveryLogs} profile={profile} user={user} appId={appId} />}
              {activeTab === 'summary' && <WeeklySummaryComponent user={user} logs={logs} dailyStats={dailyStats} profile={profile} />}
              {activeTab === 'trophies' && <TrophyRoom user={user} appId={appId} profile={profile} logs={logs} dailyStats={dailyStats} recoveryLogs={recoveryLogs} />}
              {activeTab === 'log' && <WorkoutLogger user={user} logs={logs} dailyStats={dailyStats} appId={appId} profile={profile} />}
              {activeTab === 'recovery' && <RecoveryCheckIn user={user} recoveryLogs={recoveryLogs} appId={appId} />}
              {activeTab === 'spreadsheet' && <SpreadsheetView logs={logs} user={user} appId={appId} />}
              {activeTab === 'settings' && <Settings user={user} appId={appId} profile={profile} currentWeight={dailyStats[0]?.bodyWeight || 0} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NavTab({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-300",
        active 
          ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50' 
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'
      )}
    >
      {icon} {label}
    </button>
  );
}

function MobileNavTab({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-5 rounded-2xl text-lg font-black uppercase tracking-widest transition-all duration-300 border",
        active 
          ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' 
          : 'bg-zinc-900/50 text-zinc-500 border-zinc-800/50'
      )}
    >
      {icon} {label}
    </button>
  );
}
