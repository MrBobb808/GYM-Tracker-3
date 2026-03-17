import React, { useState, useRef } from 'react';
import { Table2, Download, Upload, Loader2, Trash2, Edit2, Save, X } from 'lucide-react';
import { doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { WorkoutLog } from '../types';

interface SpreadsheetViewProps {
  logs: WorkoutLog[];
  user: any;
  appId: string;
}

export default function SpreadsheetView({ logs, user, appId }: SpreadsheetViewProps) {
  const [editingLog, setEditingLog] = useState<WorkoutLog | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').filter(row => row.trim() !== '');
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const cols = row.split(',').map(col => col.replace(/(^"|"$)/g, '').trim());
          if (!cols || cols.length < 5) continue;
          
          const date = cols[0];
          const type = (cols[1] || '').toLowerCase() as 'strength' | 'bjj';
          const phase = cols[2] || '';
          const day = cols[3] || '';
          const exercise = cols[4] || '';
          const detailStr = cols[5] || '';
          const load = parseFloat(cols[6]) || 0;
          const notes = cols[7] || '';

          const cleanName = exercise.replace(/[^a-zA-Z0-9]/g, '') || 'BJJ';
          const docId = `${date}_${cleanName}`;

          if (type === 'strength') {
            const setsArray: any[] = [];
            if (detailStr) {
              const setParts = detailStr.split(' | ');
              setParts.forEach(part => {
                try {
                  const dataPart = part.includes(':') ? part.split(':')[1] : part;
                  if (dataPart) {
                    const [weightPart, repsPart] = dataPart.split('lbs x');
                    setsArray.push({ 
                      weight: weightPart ? weightPart.trim() : '', 
                      reps: repsPart ? repsPart.trim() : '',
                      estimated1RM: 0 // Will be recalculated on next load or we can calc here
                    });
                  }
                } catch (err) {}
              });
            }
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', docId), {
              date, phase, day, type, exercise, sets: setsArray, sessionLoad: load, techniqueNotes: notes, timestamp: new Date().toISOString()
            }, { merge: true });
          } else if (type === 'bjj') {
            const rounds = parseInt(detailStr.split('rounds')[0]) || 0;
            const attendedClass = detailStr.includes('Attended Class');
            await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', docId), {
              date, phase, day, type, rounds, attendedClass, sessionLoad: load, notes, timestamp: new Date().toISOString()
            }, { merge: true });
          }
        }
        showStatus("CSV Imported Successfully!");
      } catch (error) { 
        handleFirestoreError(error, OperationType.WRITE, `artifacts/${appId}/users/${user.uid}/workout_logs`);
        showStatus("Failed to parse the CSV.", 'error'); 
      } 
      finally { setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };
    reader.readAsText(file);
  };

  const handleDelete = async (logId: string) => {
    if(!user) return;
    setDeletingId(logId);
    try { 
      await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', logId)); 
      showStatus("Entry deleted successfully.");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `artifacts/${appId}/users/${user.uid}/workout_logs/${logId}`);
      showStatus("Failed to delete entry.", 'error');
    } finally { 
      setDeletingId(null); 
      setConfirmDeleteId(null);
    }
  };

  const handleUpdateLog = async () => {
    if(!user || !editingLog || !editingLog.id) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'workout_logs', editingLog.id), { sets: editingLog.sets });
      setEditingLog(null);
      showStatus("Updated successfully.");
    } catch(e) { 
      handleFirestoreError(e, OperationType.UPDATE, `artifacts/${appId}/users/${user.uid}/workout_logs/${editingLog.id}`);
      showStatus("Failed to update.", 'error'); 
    }
  };

  const updateEditSet = (index: number, field: string, value: string) => {
    if (!editingLog) return;
    const newSets = [...editingLog.sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setEditingLog({ ...editingLog, sets: newSets });
  };

  const triggerCSVDownload = (logs: WorkoutLog[]) => {
    if (logs.length === 0) { showStatus("No data available to export.", 'error'); return; }
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
        log.sessionLoad || 0, 
        `"${log.notes || log.techniqueNotes || ''}"`
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Grapplers_Iron_Backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 border-b border-white/5 pb-6 relative">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">Data Sheet</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage synced session data.</p>
        </div>
        
        {statusMessage && (
          <div className={`absolute top-0 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-xs font-bold animate-in slide-in-from-top duration-300 z-50 shadow-lg shadow-black/20 ${
            statusMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {statusMessage.text}
          </div>
        )}
        <div className="flex gap-3 w-full sm:w-auto">
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#111111] hover:bg-[#1A1A1A] border border-white/10 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
            {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Import CSV
          </button>
          <button onClick={() => triggerCSVDownload(logs)} disabled={logs.length === 0 || isImporting} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 rounded-lg text-sm font-semibold transition-colors">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0D0D0D] shadow-xl shadow-black/40">
        <table className="w-full text-left text-sm text-zinc-400 whitespace-nowrap">
          <thead className="bg-[#111111] border-b border-white/5">
            <tr>
              <th className="p-5 font-medium tracking-wide">Date</th>
              <th className="p-5 font-medium tracking-wide">Exercise</th>
              <th className="p-5 font-medium tracking-wide">Sets Recorded</th>
              <th className="p-5 font-medium tracking-wide text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.length === 0 ? (
              <tr><td colSpan={4} className="p-12 text-center text-zinc-600">No data found in this session. Click Import CSV to restore.</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-5 text-zinc-300">{log.date}</td>
                  <td className="p-5 text-zinc-200 font-medium">{log.exercise}</td>
                  <td className="p-5">
                    {editingLog?.id === log.id ? (
                      <div className="flex flex-wrap gap-2">
                         {editingLog.type === 'strength' && editingLog.sets?.map((s, idx) => (
                           <div key={idx} className="flex items-center gap-2 bg-[#050505] px-3 py-1.5 rounded-md border border-zinc-700">
                             <span className="text-[10px] text-zinc-500 font-bold">S{idx+1}</span>
                             <input type="number" value={s.weight} onChange={(e)=>updateEditSet(idx, 'weight', e.target.value)} className="w-10 bg-transparent text-center text-white outline-none" />
                             <span className="text-zinc-600">×</span>
                             <input type="text" value={s.reps} onChange={(e)=>updateEditSet(idx, 'reps', e.target.value)} className="w-8 bg-transparent text-center text-white outline-none" />
                           </div>
                         ))}
                         {editingLog.type === 'bjj' && (
                           <div className="flex items-center gap-4 text-xs font-bold text-zinc-400">
                             <span>Rounds: {editingLog.rounds}</span>
                             <span>{editingLog.attendedClass ? 'Attended Class' : 'No Class'}</span>
                           </div>
                         )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3 font-mono text-[11px] tracking-wider">
                        {log.type === 'strength' && log.sets ? log.sets.map((s, idx) => {
                          if (!s.weight && !s.reps) return null;
                          return (
                            <span key={idx} className="bg-[#050505] border border-white/5 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                              <span className="text-zinc-600">S{idx+1}</span>
                              <span className="text-white font-medium">{s.weight || '-'}</span> <span className="text-zinc-600">×</span> <span className="text-white font-medium">{s.reps || '-'}</span>
                            </span>
                          );
                        }) : log.type === 'bjj' ? (
                          <span className="bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-md text-blue-400">
                            {log.rounds} Rounds | {log.attendedClass ? 'Attended Class' : 'No Class'}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </td>
                  <td className="p-5 text-center">
                    {editingLog?.id === log.id ? (
                      <div className="flex justify-center gap-3">
                        <button onClick={handleUpdateLog} className="text-emerald-400 hover:text-emerald-300"><Save size={16}/></button>
                        <button onClick={() => setEditingLog(null)} className="text-zinc-400 hover:text-white"><X size={16}/></button>
                      </div>
                    ) : confirmDeleteId === log.id ? (
                      <div className="flex justify-center items-center gap-3 animate-in fade-in zoom-in duration-200">
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Confirm?</span>
                        <button 
                          onClick={() => handleDelete(log.id!)} 
                          disabled={deletingId === log.id}
                          className="px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded hover:bg-red-600 disabled:opacity-50"
                        >
                          {deletingId === log.id ? <Loader2 size={10} className="animate-spin" /> : "YES"}
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-zinc-500 hover:text-white text-[10px] font-bold"
                        >
                          NO
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-4">
                        {log.sets && <button onClick={() => setEditingLog(JSON.parse(JSON.stringify(log)))} className="text-zinc-500 hover:text-white transition-colors"><Edit2 size={16} /></button>}
                        <button onClick={() => setConfirmDeleteId(log.id!)} className="text-zinc-500 hover:text-red-400 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
