import React, { useState, useEffect } from 'react';
import { X, GitBranch, Trash2, CheckCircle2, ShieldLock, AlertCircle, RefreshCw } from 'lucide-react';
import { BranchSummary, fetchBranchList } from '../../lib/branchStore';

interface BranchManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBranch: string;
  onSelectBranch: (branchName: string) => Promise<void>;
  onDeleteBranch: (branchName: string, password?: string) => Promise<void>;
}

export default function BranchManagerModal({
  isOpen,
  onClose,
  currentBranch,
  onSelectBranch,
  onDeleteBranch
}: BranchManagerModalProps) {
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingBranch, setDeletingBranch] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const list = await fetchBranchList();
      setBranches(list);
    } catch (e) {
      console.error('Error fetching branches:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      setDeletingBranch(null);
      setDeletePassword('');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoad = async (bName: string) => {
    setErrorMessage(null);
    try {
      await onSelectBranch(bName);
      setSuccessMessage(`✅ Switched to branch '${bName}'`);
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to switch branch';
      setErrorMessage(msg);
    }
  };

  const handleDeleteClick = (bName: string) => {
    setDeletingBranch(bName);
    setDeletePassword('');
    setErrorMessage(null);
  };

  const handleConfirmDelete = async (bName: string) => {
    const isMain = bName.toLowerCase() === 'main';
    if (isMain && !deletePassword) {
      setErrorMessage('Password "666" is required to delete/reset Main branch');
      return;
    }

    setErrorMessage(null);
    try {
      await onDeleteBranch(bName, isMain ? deletePassword : undefined);
      setSuccessMessage(isMain ? '🔄 Main branch reset to factory default!' : `🗑️ Deleted branch '${bName}'`);
      setDeletingBranch(null);
      setDeletePassword('');
      await loadBranches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete branch';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-white flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-slate-800/80 px-5 py-4 border-b border-slate-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Branch Version Manager</h3>
              <p className="text-[11px] text-slate-400">View, switch, or manage farm layout versions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Banners */}
        {errorMessage && (
          <div className="mx-5 mt-4 bg-rose-950/80 border border-rose-700 text-rose-200 p-3 rounded-xl text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-5 mt-4 bg-emerald-950/80 border border-emerald-700 text-emerald-200 p-3 rounded-xl text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Branch List Body */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              <span className="text-xs">Loading farm branches...</span>
            </div>
          ) : branches.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No branches found. Save a layout to create your first branch!
            </div>
          ) : (
            branches.map((b) => {
              const isCurrent = currentBranch.toLowerCase() === b.name.toLowerCase();
              const isMain = b.is_main || b.name.toLowerCase() === 'main';
              const isConfirmingDelete = deletingBranch === b.name;

              return (
                <div
                  key={b.name}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-950/40 border-blue-600 shadow-md ring-1 ring-blue-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <GitBranch className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-blue-400' : 'text-slate-400'}`} />
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white truncate">{b.name}</span>
                          {isMain && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-extrabold flex items-center gap-1">
                              <ShieldLock className="w-3 h-3" /> Main 🔒
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-400 mt-0.5">
                          {b.treeCount} Trees • {b.componentCount} Custom Components • Updated {new Date(b.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isCurrent && (
                        <button
                          onClick={() => handleLoad(b.name)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all"
                        >
                          Load
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteClick(b.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors"
                        title={isMain ? 'Reset Main Branch (Requires Password 666)' : 'Delete Branch'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Delete Confirmation Form */}
                  {isConfirmingDelete && (
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-2 bg-slate-900/90 p-3 rounded-lg animate-fadeIn">
                      {isMain ? (
                        <div className="space-y-2">
                          <p className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
                            <ShieldLock className="w-3.5 h-3.5" /> Password 666 required to reset Main branch:
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              placeholder="Enter password (666)"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              className="flex-1 bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-lg text-xs text-white outline-none focus:border-amber-500"
                              autoFocus
                            />
                            <button
                              onClick={() => handleConfirmDelete(b.name)}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
                            >
                              Reset Main
                            </button>
                            <button
                              onClick={() => setDeletingBranch(null)}
                              className="px-2.5 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-rose-300 font-medium">Delete branch '{b.name}' permanently?</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirmDelete(b.name)}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
                            >
                              Confirm Delete
                            </button>
                            <button
                              onClick={() => setDeletingBranch(null)}
                              className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-800/80 px-5 py-3 border-t border-slate-700 flex justify-between items-center text-xs shrink-0">
          <span className="text-slate-400">Total Branches: {branches.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
