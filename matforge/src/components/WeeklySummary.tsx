import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, Loader2, Download, Share2, Calendar, ChevronRight, Youtube, Instagram, Smartphone, Play, History, X } from 'lucide-react';
import { WeeklySummaryService } from '../services/WeeklySummaryService';
import { WorkoutLog, DailyStats, UserProfile, WeeklySummary } from '../types';
import { cn } from '../lib/utils';

interface WeeklySummaryProps {
  user: any;
  logs: WorkoutLog[];
  dailyStats: DailyStats[];
  profile: UserProfile | null;
}

export default function WeeklySummaryComponent({ user, logs, dailyStats, profile }: WeeklySummaryProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFormatting, setIsFormatting] = useState(false);
  const [style, setStyle] = useState<'3d' | 'comic' | 'photorealistic'>('3d');
  const [latestSummary, setLatestSummary] = useState<WeeklySummary | null>(null);
  const [macrocycle, setMacrocycle] = useState<WeeklySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [formattedImage, setFormattedImage] = useState<string | null>(null);
  const [activeFormat, setActiveFormat] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [showTimelapse, setShowTimelapse] = useState(false);
  const [timelapseIndex, setTimelapseIndex] = useState(0);

  useEffect(() => {
    checkApiKey();
    loadLatestSummary();
    loadMacrocycle();
  }, [user]);

  const checkApiKey = async () => {
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    }
  };

  const loadLatestSummary = async () => {
    if (user?.email) {
      const summary = await WeeklySummaryService.getLatestSummary(user.email);
      setLatestSummary(summary);
    }
  };

  const loadMacrocycle = async () => {
    if (user?.email) {
      const summaries = await WeeklySummaryService.getMacrocycleSummaries(user.email);
      setMacrocycle(summaries);
    }
  };

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!hasKey) {
      await handleOpenKeyDialog();
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const metrics = WeeklySummaryService.aggregateWeeklyMetrics(logs, dailyStats, profile);
      const service = new WeeklySummaryService(process.env.API_KEY || "");
      
      const { imageUrl: baseImage, prompt } = await service.generateSummaryImage(metrics, style, profile);
      const finalImageUrl = await service.overlayTextOnImage(baseImage, metrics);

      const summary: WeeklySummary = {
        ...metrics,
        imageUrl: finalImageUrl,
        prompt,
        style,
        timestamp: new Date().toISOString()
      };

      await WeeklySummaryService.saveSummary(user.email, summary);
      setLatestSummary(summary);
      loadMacrocycle();
    } catch (err: any) {
      console.error("Generation failed:", err);
      if (err.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        setError("API Key session expired. Please select your key again.");
      } else {
        setError("Failed to generate summary. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormat = async (ratio: '1:1' | '16:9' | '9:16') => {
    if (!latestSummary?.imageUrl) return;
    setIsFormatting(true);
    setActiveFormat(ratio);
    try {
      const formatted = await WeeklySummaryService.formatImage(latestSummary.imageUrl, ratio);
      setFormattedImage(formatted);
    } catch (err) {
      console.error("Formatting failed:", err);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleShare = async () => {
    if (!formattedImage) return;
    
    try {
      const blob = await (await fetch(formattedImage)).blob();
      const file = new File([blob], `matforge-summary-${activeFormat}.png`, { type: 'image/png' });
      
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'MatForge Weekly Summary',
          text: 'Check out my progress this week on MatForge!'
        });
      } else {
        // Fallback to download
        const link = document.createElement('a');
        link.href = formattedImage;
        link.download = `matforge-summary-${activeFormat}.png`;
        link.click();
      }
    } catch (err) {
      console.error("Sharing failed:", err);
    }
  };

  useEffect(() => {
    let interval: any;
    if (showTimelapse && macrocycle.length > 0) {
      interval = setInterval(() => {
        setTimelapseIndex((prev) => (prev + 1) % macrocycle.length);
      }, 1000); // 1 second per week for preview
    }
    return () => clearInterval(interval);
  }, [showTimelapse, macrocycle.length]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3 uppercase">
            Weekly Legacy <Sparkles className="text-amber-500" size={24} />
          </h2>
          <p className="text-zinc-500 mt-1 font-medium">Automated visual summary of your weekly forge.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {macrocycle.length >= 2 && (
            <button 
              onClick={() => setShowTimelapse(true)}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2"
            >
              <History size={16} /> Macrocycle Timelapse
            </button>
          )}
          {!hasKey && (
            <button 
              onClick={handleOpenKeyDialog}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-500/20"
            >
              Connect Gemini API
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-[2rem] space-y-6">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest">Visual Aesthetic</h3>
            
            <div className="grid grid-cols-1 gap-3">
              <StyleOption 
                active={style === '3d'} 
                onClick={() => setStyle('3d')} 
                title="3D Animated" 
                desc="Pixar-style vibrant renders" 
              />
              <StyleOption 
                active={style === 'comic'} 
                onClick={() => setStyle('comic')} 
                title="Gritty Comic" 
                desc="Bold ink and dramatic shadows" 
              />
              <StyleOption 
                active={style === 'photorealistic'} 
                onClick={() => setStyle('photorealistic')} 
                title="Photorealistic" 
                desc="Cinematic lighting and detail" 
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 text-black disabled:text-zinc-600 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-amber-500/10 flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Forging Image...
                </>
              ) : (
                <>
                  <ImageIcon size={20} />
                  Generate Summary
                </>
              )}
            </button>

            {error && (
              <p className="text-xs text-red-400 font-bold text-center bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                {error}
              </p>
            )}
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800/30 p-6 rounded-[2rem]">
            <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Sharing Module</h3>
            <div className="space-y-3">
              <button 
                onClick={() => { setShowExportModal(true); handleFormat('1:1'); }}
                disabled={!latestSummary}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400 group-hover:text-amber-500 transition-colors">
                    <Share2 size={18} />
                  </div>
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-300">Broadcast Summary</span>
                </div>
                <ChevronRight size={16} className="text-zinc-700 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          {latestSummary ? (
            <div className="space-y-6">
              <div className="relative group rounded-[2.5rem] overflow-hidden border border-zinc-800 shadow-2xl">
                <img 
                  src={latestSummary.imageUrl} 
                  alt="Weekly Summary" 
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={() => { setShowExportModal(true); handleFormat('1:1'); }}
                    className="bg-white text-black p-4 rounded-full hover:scale-110 transition-transform shadow-xl"
                  >
                    <Share2 size={24} />
                  </button>
                  <a 
                    href={latestSummary.imageUrl} 
                    download={`matforge-summary-${latestSummary.weekEnding}.png`}
                    className="bg-white text-black p-4 rounded-full hover:scale-110 transition-transform shadow-xl"
                  >
                    <Download size={24} />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-900 rounded-xl border border-zinc-800">
                    <Calendar className="text-amber-500" size={18} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Week Ending</div>
                    <div className="text-sm font-bold text-white">{new Date(latestSummary.weekEnding).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Aesthetic</div>
                  <div className="text-sm font-bold text-amber-500 capitalize">{latestSummary.style}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-[3rem] flex flex-col items-center justify-center text-zinc-600 space-y-4 p-12 text-center">
              <div className="p-6 bg-zinc-900/50 rounded-full border border-zinc-800">
                <ImageIcon size={48} strokeWidth={1} />
              </div>
              <div>
                <h3 className="text-lg font-black text-zinc-400 uppercase tracking-tighter">No Summary Generated</h3>
                <p className="text-sm max-w-xs mx-auto mt-2">Forge your first weekly visual summary to see your progress mapped to Biblit.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowExportModal(false)} />
          <div className="relative bg-[#1A1A1A] border border-zinc-800 w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
              {/* Preview Area */}
              <div className="flex-1 bg-black flex items-center justify-center p-8">
                {isFormatting ? (
                  <Loader2 className="animate-spin text-amber-500" size={48} />
                ) : formattedImage ? (
                  <img src={formattedImage} alt="Formatted" className="max-w-full max-h-full object-contain shadow-2xl" />
                ) : null}
              </div>

              {/* Controls Area */}
              <div className="w-full md:w-80 bg-zinc-900 p-8 flex flex-col gap-8 border-l border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Broadcast Format</h3>
                  <button onClick={() => setShowExportModal(false)} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  <FormatButton 
                    active={activeFormat === '1:1'} 
                    onClick={() => handleFormat('1:1')} 
                    icon={<Instagram size={18} />} 
                    label="Grid Post" 
                    ratio="1:1" 
                  />
                  <FormatButton 
                    active={activeFormat === '9:16'} 
                    onClick={() => handleFormat('9:16')} 
                    icon={<Smartphone size={18} />} 
                    label="Reels / Stories" 
                    ratio="9:16" 
                  />
                  <FormatButton 
                    active={activeFormat === '16:9'} 
                    onClick={() => handleFormat('16:9')} 
                    icon={<Youtube size={18} />} 
                    label="Community Tab" 
                    ratio="16:9" 
                  />
                </div>

                <div className="mt-auto space-y-3">
                  <button 
                    onClick={handleShare}
                    className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all"
                  >
                    <Share2 size={18} /> One-Tap Share
                  </button>
                  <p className="text-[10px] text-zinc-500 text-center font-medium">
                    Automatically formatted for optimal engagement on your selected platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timelapse Modal */}
      {showTimelapse && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowTimelapse(false)} />
          <div className="relative w-full max-w-2xl aspect-square bg-zinc-900 rounded-[3rem] overflow-hidden border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-500">
            {macrocycle.length > 0 && (
              <div className="relative h-full">
                <img 
                  src={macrocycle[timelapseIndex].imageUrl} 
                  alt="Timelapse" 
                  className="w-full h-full object-cover transition-opacity duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                <div className="absolute bottom-12 left-12 right-12 flex items-end justify-between">
                  <div>
                    <div className="text-amber-500 font-black text-4xl tracking-tighter uppercase mb-1">
                      Week {timelapseIndex + 1}
                    </div>
                    <div className="text-zinc-400 font-bold uppercase tracking-widest text-xs">
                      {new Date(macrocycle[timelapseIndex].weekEnding).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {macrocycle.map((_, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "h-1 rounded-full transition-all duration-300",
                          i === timelapseIndex ? "w-8 bg-amber-500" : "w-2 bg-zinc-700"
                        )} 
                      />
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setShowTimelapse(false)}
                  className="absolute top-8 right-8 p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black transition-colors"
                >
                  <X size={24} />
                </button>

                <div className="absolute top-8 left-8 flex items-center gap-3 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                  <Play className="text-amber-500 fill-amber-500" size={14} />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest">Macrocycle Evolution</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StyleOption({ active, onClick, title, desc }: { active: boolean, onClick: () => void, title: string, desc: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between group",
        active 
          ? "bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5" 
          : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
      )}
    >
      <div>
        <div className={cn("text-xs font-black uppercase tracking-widest mb-1", active ? "text-amber-500" : "text-zinc-300")}>
          {title}
        </div>
        <div className="text-[10px] text-zinc-500 font-medium">{desc}</div>
      </div>
      <ChevronRight className={cn("transition-transform", active ? "text-amber-500 translate-x-1" : "text-zinc-700 group-hover:translate-x-1")} size={16} />
    </button>
  );
}

function FormatButton({ active, onClick, icon, label, ratio }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, ratio: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 group",
        active 
          ? "bg-white border-white text-black" 
          : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg transition-colors", active ? "bg-black/5 text-black" : "bg-zinc-900 text-zinc-500")}>
          {icon}
        </div>
        <div className="text-left">
          <div className="text-[10px] font-black uppercase tracking-widest">{label}</div>
          <div className={cn("text-[9px] font-bold", active ? "text-black/60" : "text-zinc-600")}>{ratio}</div>
        </div>
      </div>
      {active && <div className="w-2 h-2 rounded-full bg-black" />}
    </button>
  );
}
