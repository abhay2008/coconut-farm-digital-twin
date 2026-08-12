import React, { useState } from 'react';
import { X, Save, ShieldLock, GitBranch, CheckCircle2, AlertCircle } from 'lucide-react';

interface SaveLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBranch: (branchName: string) => Promise<void>;
  onSaveMain: (password: string) => Promise<void>;
  currentBranch: string;
}

export default function SaveLayoutModal({
  isOpen,
  onClose,
  onSaveBranch,
  onSaveMain,
  currentBranch
}: SaveLayoutModalProps) {
  const [activeTab, setActiveTab] = useState<'branch' | 'main'>('branch');
  const [branchName, setBranchName] = useState(currentBranch !== 'main' ? currentBranch : '');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) {
      setErrorMessage('Please enter a valid branch name');
      return;
    }
    if (branchName.trim().toLowerCase() === 'main') {
      setErrorMessage('To save to Main, please switch to the "Save to Main Branch" tab and enter password 666');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await onSaveBranch(branchName.trim());
      setSuccessMessage(`✅ Branch '${branchName.trim()}' saved successfully!`);
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save branch';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Password is required to save to Main branch');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await onSaveMain(password);
      setSuccessMessage('✅ Main branch updated successfully!');
      setPassword('');
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save to Main branch';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-white">
        
        {/* Header */}
        <div className="bg-slate-800/80 px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Save className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Save Farm Layout</h3>
              <p className="text-[11px] text-slate-400">Choose how you want to persist your farm design</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 bg-slate-950 p-1.5 gap-1.5 border-b border-slate-800 text-xs font-semibold">
          <button
            onClick={() => { setActiveTab('branch'); setErrorMessage(null); }}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'branch'
                ? 'bg-blue-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span>1. Save as Branch</span>
          </button>

          <button
            onClick={() => { setActiveTab('main'); setErrorMessage(null); }}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'main'
                ? 'bg-amber-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldLock className="w-4 h-4 text-amber-300" />
            <span>2. Save to Main 🔒</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {errorMessage && (
            <div className="bg-rose-950/80 border border-rose-700 text-rose-200 p-3 rounded-xl text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-200 p-3 rounded-xl text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: Save as Branch */}
          {activeTab === 'branch' && (
            <form onSubmit={handleBranchSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Branch Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. North Sector Drip Redesign"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400">
                  Creates an independent version layout. No password required.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <GitBranch className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Branch'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Save to Main */}
          {activeTab === 'main' && (
            <form onSubmit={handleMainSubmit} className="space-y-4">
              <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-xl space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <ShieldLock className="w-4 h-4" />
                  <span>Protected Action</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Saving to the <strong>Main</strong> branch updates the default layout shown to every visitor on open.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Security Password Required
                </label>
                <input
                  type="password"
                  placeholder="Enter password (666)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all tracking-widest"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ShieldLock className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Updating Main...' : 'Overwrite Main Branch'}</span>
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
