import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Loader2, Bot, User, Dumbbell, Swords, Scale, Volume2, VolumeX, Mic, MicOff, Radio, BarChart2, RotateCcw, History, Plus, ChevronLeft } from 'lucide-react';
import { chatWithAssistant, generateSpeech } from '../services/geminiService';
import { LiveAssistantSession } from '../services/liveAssistantService';
import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { addXp, XP_REWARDS } from '../utils/xp';

interface Message {
  role: 'user' | 'model';
  text: string;
  type?: 'strength' | 'bjj' | 'weight' | 'system';
}

interface ChatSession {
  id: string;
  title: string;
  updatedAt: any;
  messages: Message[];
}

interface ChatAssistantProps {
  user: any;
  appId: string;
  variant?: 'floating' | 'nav';
}

const ChartRenderer = ({ content }: { content: string }) => {
  try {
    const chartData = JSON.parse(content);
    return (
      <div className="w-full h-48 mt-4 bg-white/5 rounded-xl p-3 border border-white/10">
        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2 flex items-center gap-2">
          <BarChart2 size={12} />
          {chartData.title}
        </div>
        <ResponsiveContainer width="100%" height="100%">
          {chartData.type === 'bar' ? (
            <BarChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="label" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '10px' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <LineChart data={chartData.data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="label" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '10px' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  } catch (e) {
    return <pre className="text-[10px] text-red-400">Error rendering chart</pre>;
  }
};

export default function ChatAssistant({ user, appId, variant = 'floating' }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryViewOpen, setIsHistoryViewOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hey! I'm **Iron Bot**, your elite performance assistant. Ready to log some work or analyze your progress? Just ask!" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('current');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const liveSessionRef = useRef<LiveAssistantSession | null>(null);

  // Load all sessions for the history view
  const loadSessions = async () => {
    if (!user || !appId) return;
    try {
      const sessionsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'chat_history');
      const q = query(sessionsRef, orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      const loadedSessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      setSessions(loadedSessions);
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  // Load specific chat history
  useEffect(() => {
    const loadHistory = async () => {
      if (!user || !appId) return;
      try {
        const historyRef = doc(db, 'artifacts', appId, 'users', user.uid, 'chat_history', currentSessionId);
        const historyDoc = await getDoc(historyRef);
        if (historyDoc.exists()) {
          const data = historyDoc.data();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        } else if (currentSessionId === 'current') {
          // Default initial message for new "current" session
          setMessages([{ role: 'model', text: "Hey! I'm **Iron Bot**, your elite performance assistant. Ready to log some work or analyze your progress? Just ask!" }]);
        }
      } catch (error) {
        console.error("Error loading chat history:", error);
      } finally {
        setIsHistoryLoaded(true);
      }
    };
    loadHistory();
  }, [user, appId, currentSessionId]);

  // Save chat history
  useEffect(() => {
    const saveHistory = async () => {
      if (!isHistoryLoaded || !user || !appId || messages.length <= 1) return;
      try {
        const historyRef = doc(db, 'artifacts', appId, 'users', user.uid, 'chat_history', currentSessionId);
        
        // Determine a title from the first user message
        const firstUserMsg = messages.find(m => m.role === 'user')?.text || 'New Chat';
        const title = firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? '...' : '');

        await setDoc(historyRef, {
          messages,
          title,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error("Error saving chat history:", error);
      }
    };
    saveHistory();
  }, [messages, isHistoryLoaded, user, appId, currentSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.close();
      }
    };
  }, []);

  const handleResetChat = async () => {
    const initialMessage: Message = { role: 'model', text: "Hey! I'm **Iron Bot**, your elite performance assistant. Ready to log some work or analyze your progress? Just ask!" };
    setMessages([initialMessage]);
    setShowResetConfirm(false);
    if (user && appId) {
      try {
        const historyRef = doc(db, 'artifacts', appId, 'users', user.uid, 'chat_history', currentSessionId);
        await setDoc(historyRef, {
          messages: [initialMessage],
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Error resetting chat history:", error);
      }
    }
  };

  const startNewChat = () => {
    const newId = `session_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([{ role: 'model', text: "Hey! I'm **Iron Bot**, your elite performance assistant. Ready to log some work or analyze your progress? Just ask!" }]);
    setIsHistoryViewOpen(false);
  };

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setIsHistoryViewOpen(false);
  };

  const toggleLiveMode = async () => {
    if (isLiveMode) {
      liveSessionRef.current?.close();
      liveSessionRef.current = null;
      setIsLiveMode(false);
      setMessages(prev => [...prev, { role: 'model', text: "Live session ended. Switching back to chat mode." }]);
    } else {
      setIsLiveMode(true);
      setMessages(prev => [...prev, { role: 'model', text: "Starting live voice session... You can now speak to me directly." }]);
      
      const session = new LiveAssistantSession(
        (text, role) => {
          setMessages(prev => [...prev, { role, text }]);
        },
        () => {
          console.log("Interrupted");
        }
      );
      
      await session.connect();
      liveSessionRef.current = session;
    }
  };

  const playResponse = async (text: string) => {
    if (!isVoiceEnabled || isLiveMode) return;
    try {
      // Clean markdown for TTS
      const cleanText = text.replace(/[*_#`]/g, '').replace(/```[\s\S]*?```/g, 'Chart displayed.');
      const base64Audio = await generateSpeech(cleanText);
      if (base64Audio) {
        const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        } else {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.play();
        }
      }
    } catch (error) {
      console.error("TTS Error:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !user || isLiveMode) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      let currentHistory = messages
        .filter((m, i) => !(i === 0 && m.role === 'model'))
        .map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }));

      let currentMessage = userMessage;
      let response = await chatWithAssistant(currentMessage, currentHistory);
      let modelResponseText = "";
      
      let toolCallCount = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && toolCallCount < 5) {
        toolCallCount++;
        
        // Add the user's message and the model's tool call to history
        currentHistory.push({ role: 'user', parts: [{ text: currentMessage }] });
        // Note: The SDK response doesn't easily convert back to a history part with functionCalls 
        // without some manual mapping, so we'll just use a text representation for the model's turn
        currentHistory.push({ role: 'model', parts: [{ text: "I need to check some data first." }] });

        const toolResponses: any[] = [];
        for (const call of response.functionCalls) {
          const args = call.args as any;
          const date = args.date || new Date().toISOString().split('T')[0];

          if (call.name === 'logStrengthExercise') {
            const docId = `${date}_${args.exercise.replace(/[^a-zA-Z0-9]/g, '')}`;
            const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', docId);
            const existing = await getDoc(docRef);
            const existingData = existing.exists() ? existing.data() : { sets: [] };
            
            const newSets = [...(existingData.sets || [])];
            const setIdx = args.setIndex - 1;
            const w = parseFloat(args.weight);
            const r = parseFloat(args.reps);
            const est1RM = Math.round(w * (1 + r / 30));
            
            newSets[setIdx] = { weight: args.weight.toString(), reps: args.reps.toString(), estimated1RM: est1RM };

            await setDoc(docRef, {
              date,
              type: 'strength',
              exercise: args.exercise,
              sets: newSets,
              timestamp: new Date().toISOString()
            }, { merge: true });

            // Award XP for gym session if not already awarded today
            const dailyStatsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', `${date}_daily_stats`);
            const dailyStatsDoc = await getDoc(dailyStatsRef);
            const dailyStatsData = dailyStatsDoc.exists() ? dailyStatsDoc.data() : {};
            const xpAwardedFor = dailyStatsData.xpAwardedFor || {};
            
            if (!xpAwardedFor.strength) {
              await addXp(user.uid, appId, XP_REWARDS.GYM_SESSION);
              xpAwardedFor.strength = true;
              await setDoc(dailyStatsRef, { xpAwardedFor }, { merge: true });
            }

            toolResponses.push({ name: call.name, content: { status: "success" } });
            setMessages(prev => [...prev, { role: 'model', text: `Logged ${args.exercise}: Set ${args.setIndex} - ${args.weight}lbs x ${args.reps} reps.`, type: 'strength' }]);
          } 
          
          else if (call.name === 'logBjjSession') {
            const docId = `${date}_BJJ`;
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', docId), {
              date,
              type: 'bjj',
              rounds: args.rounds,
              attendedClass: args.attendedClass,
              notes: args.notes || '',
              timestamp: new Date().toISOString()
            }, { merge: true });

            // Award XP for BJJ
            const dailyStatsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', `${date}_daily_stats`);
            const dailyStatsDoc = await getDoc(dailyStatsRef);
            const dailyStatsData = dailyStatsDoc.exists() ? dailyStatsDoc.data() : {};
            const xpAwardedFor = dailyStatsData.xpAwardedFor || {};
            
            let xpUpdated = false;
            if (!xpAwardedFor.bjjAttendance) {
              await addXp(user.uid, appId, XP_REWARDS.BJJ_ATTENDANCE);
              xpAwardedFor.bjjAttendance = true;
              xpUpdated = true;
            }
            
            const newRounds = parseInt(args.rounds || '0', 10);
            const previouslyAwardedRounds = xpAwardedFor.roundsRolled || 0;
            if (newRounds > previouslyAwardedRounds) {
              const roundsToAward = newRounds - previouslyAwardedRounds;
              for (let i = 0; i < roundsToAward; i++) {
                await addXp(user.uid, appId, XP_REWARDS.ROUND_ROLLED);
              }
              xpAwardedFor.roundsRolled = newRounds;
              xpUpdated = true;
            }

            if (xpUpdated) {
              await setDoc(dailyStatsRef, { xpAwardedFor }, { merge: true });
            }

            toolResponses.push({ name: call.name, content: { status: "success" } });
            setMessages(prev => [...prev, { role: 'model', text: `Logged BJJ Session: ${args.rounds} rounds rolled.`, type: 'bjj' }]);
          }

          else if (call.name === 'logWeight') {
            const docId = `${date}_daily_stats`;
            const dailyStatsRef = doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', docId);
            const dailyStatsDoc = await getDoc(dailyStatsRef);
            const dailyStatsData = dailyStatsDoc.exists() ? dailyStatsDoc.data() : {};
            const xpAwardedFor = dailyStatsData.xpAwardedFor || {};

            if (!xpAwardedFor.weight) {
              await addXp(user.uid, appId, XP_REWARDS.LOG_WEIGHT);
              xpAwardedFor.weight = true;
            }

            await setDoc(dailyStatsRef, {
              isDailyStats: true,
              date,
              bodyWeight: parseFloat(args.weight),
              timestamp: new Date().toISOString(),
              xpAwardedFor
            }, { merge: true });

            toolResponses.push({ name: call.name, content: { status: "success" } });
            setMessages(prev => [...prev, { role: 'model', text: `Updated weight to ${args.weight} lbs for ${date}.`, type: 'weight' }]);
          }

          else if (call.name === 'getWorkoutLogs') {
            const logsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'workout_logs');
            // Ensure we have a valid date range, defaulting to last 30 days if somehow missing
            const start = args.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const end = args.endDate || new Date().toISOString().split('T')[0];

            let q = query(
              logsRef, 
              where('date', '>=', start), 
              where('date', '<=', end),
              orderBy('date', 'desc')
            );
            
            const snapshot = await getDocs(q);
            let logs = snapshot.docs.map(doc => doc.data());
            
            // Filter by type if specified
            if (args.type) {
              logs = logs.filter((l: any) => {
                if (args.type === 'weight') return l.isDailyStats;
                return l.type === args.type;
              });
            }

            // Filter by exercise if specified (new relevance filter)
            if (args.exercise) {
              const search = args.exercise.toLowerCase();
              logs = logs.filter((l: any) => 
                l.exercise && l.exercise.toLowerCase().includes(search)
              );
            }

            // Limit to most relevant logs to avoid context bloat
            const relevantLogs = logs.slice(0, 20);

            toolResponses.push({ name: call.name, content: { logs: relevantLogs, totalFound: logs.length } });
          }
        }

        const toolResultText = toolResponses.map(tr => `Tool ${tr.name} results: ${JSON.stringify(tr.content)}`).join('\n');
        currentMessage = `Here is the data you requested:\n${toolResultText}`;
        response = await chatWithAssistant(currentMessage, currentHistory);
      }

      modelResponseText = response.text || "I've processed your request.";
      if (modelResponseText && !modelResponseText.includes("Tool log")) {
        setMessages(prev => [...prev, { role: 'model', text: modelResponseText }]);
      }

      if (isVoiceEnabled && modelResponseText) {
        playResponse(modelResponseText);
      }
    } catch (error) {
      console.error("Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I ran into an issue. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-[60]",
          variant === 'floating' ? "fixed bottom-6 left-6 w-14 h-14 bg-emerald-500 text-black shadow-2xl" : "p-2 text-zinc-500 hover:text-emerald-400",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
      >
        <MessageSquare size={variant === 'floating' ? 24 : 20} />
      </button>

      {/* Chat Window */}
      <div className={cn(
        "fixed w-[90vw] sm:w-[450px] h-[650px] max-h-[85vh] bg-[#0D0D0D] border border-white/10 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden transition-all duration-500 z-[70]",
        variant === 'floating' ? "bottom-6 left-6 origin-bottom-left" : "top-16 right-4 origin-top-right",
        !isOpen && "scale-0 opacity-0 pointer-events-none"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            {isHistoryViewOpen ? (
              <button 
                onClick={() => setIsHistoryViewOpen(false)}
                className="p-2 -ml-2 text-zinc-500 hover:text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Bot size={18} />
              </div>
            )}
            <div>
              <div className="text-sm font-black text-white uppercase tracking-widest">
                {isHistoryViewOpen ? 'Chat History' : 'Iron Bot'}
              </div>
              {!isHistoryViewOpen && (
                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Elite Performance Assistant</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isHistoryViewOpen && (
              <>
                <button 
                  onClick={() => {
                    loadSessions();
                    setIsHistoryViewOpen(true);
                  }}
                  className="p-2 text-zinc-500 hover:text-white transition-colors"
                  title="View History"
                >
                  <History size={18} />
                </button>
                {showResetConfirm ? (
                  <div className="flex items-center gap-1 bg-white/5 rounded-full px-2 py-1 border border-white/10">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase">Clear?</span>
                    <button onClick={handleResetChat} className="text-[8px] font-black text-emerald-500 hover:text-emerald-400 uppercase">Yes</button>
                    <button onClick={() => setShowResetConfirm(false)} className="text-[8px] font-black text-red-500 hover:text-red-400 uppercase">No</button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowResetConfirm(true)}
                    className="p-2 text-zinc-500 hover:text-white transition-colors"
                    title="Reset Chat"
                  >
                    <RotateCcw size={18} />
                  </button>
                )}
                <button 
                  onClick={toggleLiveMode}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    isLiveMode ? "bg-red-500/20 text-red-400 animate-pulse" : "text-zinc-500 hover:text-white"
                  )}
                  title={isLiveMode ? "Stop Live Session" : "Start Live Voice Session"}
                >
                  <Radio size={20} />
                </button>
                <button 
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  className={cn(
                    "p-2 rounded-full transition-all",
                    isVoiceEnabled ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:text-white"
                  )}
                  title={isVoiceEnabled ? "Voice Enabled" : "Voice Disabled"}
                >
                  {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                </button>
              </>
            )}
            <button onClick={() => setIsOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {isHistoryViewOpen ? (
          <div className="flex-grow overflow-y-auto p-4 space-y-2 scrollbar-hide bg-black/20">
            <button 
              onClick={startNewChat}
              className="w-full p-4 rounded-2xl bg-emerald-500 text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-400 transition-colors mb-6"
            >
              <Plus size={16} />
              New Chat
            </button>
            
            <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 px-2">Previous Sessions</div>
            
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-xs font-bold uppercase tracking-widest">No history found</div>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => selectSession(session.id)}
                  className={cn(
                    "w-full p-4 rounded-2xl border transition-all text-left flex flex-col gap-1 group",
                    currentSessionId === session.id 
                      ? "bg-emerald-500/10 border-emerald-500/50" 
                      : "bg-white/5 border-white/5 hover:border-white/20"
                  )}
                >
                  <div className={cn(
                    "text-xs font-bold truncate",
                    currentSessionId === session.id ? "text-emerald-400" : "text-zinc-300"
                  )}>
                    {session.title || 'Untitled Chat'}
                  </div>
                  <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-tighter">
                    {session.updatedAt?.toDate ? session.updatedAt.toDate().toLocaleDateString() : 'Just now'}
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-6 scrollbar-hide">
              {messages.map((m, i) => (
                <div key={i} className={cn(
                  "flex w-full",
                  m.role === 'user' ? "justify-end" : "justify-start"
                )}>
                  <div className={cn(
                    "max-w-[90%] p-4 rounded-2xl text-sm",
                    m.role === 'user' 
                      ? "bg-emerald-500 text-black font-medium rounded-tr-none" 
                      : "bg-white/5 text-zinc-300 border border-white/5 rounded-tl-none"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      {m.role === 'model' && <Bot size={12} className="text-emerald-500" />}
                      {m.role === 'user' && <User size={12} className="text-black/50" />}
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                        {m.role === 'user' ? 'You' : 'Iron Bot'}
                      </span>
                    </div>
                    
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-emerald-400 prose-ul:my-2 prose-li:my-0">
                      <Markdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            if (!inline && match && match[1] === 'chart') {
                              return <ChartRenderer content={String(children).replace(/\n$/, '')} />;
                            }
                            return (
                              <code className={cn("bg-white/10 px-1 rounded", className)} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {m.text}
                      </Markdown>
                    </div>

                    {m.type && (
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                        {m.type === 'strength' && <Dumbbell size={10} />}
                        {m.type === 'bjj' && <Swords size={10} />}
                        {m.type === 'weight' && <Scale size={10} />}
                        <span>Logged to System</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              {isLiveMode && (
                <div className="flex justify-center p-4">
                  <div className="flex items-center gap-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Live Voice Active</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-white/[0.01]">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isLiveMode}
                  placeholder={isLiveMode ? "Speak to the assistant..." : "Ask about your progress..."}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500/50 transition-all disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading || isLiveMode}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-emerald-500 hover:text-emerald-400 disabled:opacity-50 transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>
              <div className="flex justify-between items-center mt-3 px-1">
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">
                  Gemini 3.1 Flash Lite
                </p>
                <div className="flex gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    <span className="text-[8px] text-zinc-500 uppercase font-bold">Charts Enabled</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    <span className="text-[8px] text-zinc-500 uppercase font-bold">Live Voice</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
