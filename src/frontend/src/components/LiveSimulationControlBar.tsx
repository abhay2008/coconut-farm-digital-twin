import React from 'react';

export type SimulationPhase = 'idle' | 'phase1_borewell_fill' | 'phase2_pond_suction' | 'phase3_network_propagation' | 'phase4_steady_irrigation';

interface LiveSimulationControlBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  speed: number;
  onSetSpeed: (s: number) => void;
  currentPhase: SimulationPhase;
  pondVolumeLiters: number;
  maxPondCapacityLiters: number;
  elapsedSeconds: number;
  totalWaterDeliveredLiters: number;
  activeTreeCount: number;
  totalTreeCount: number;
  farmFlowLph: number;
  simulationMode: 'fill-then-drip' | 'irrigate-now';
  onSetMode: (mode: 'fill-then-drip' | 'irrigate-now') => void;
}

export const LiveSimulationControlBar: React.FC<LiveSimulationControlBarProps> = ({
  isPlaying,
  onTogglePlay,
  onReset,
  speed,
  onSetSpeed,
  currentPhase,
  pondVolumeLiters,
  maxPondCapacityLiters,
  elapsedSeconds,
  totalWaterDeliveredLiters,
  activeTreeCount,
  totalTreeCount,
  farmFlowLph,
  simulationMode,
  onSetMode,
}) => {
  const fillPercent = Math.min(100, Math.max(0, Math.round((pondVolumeLiters / maxPondCapacityLiters) * 100)));
  const speeds = [1, 2, 5, 10, 25, 50, 1000];

  const isStageA = currentPhase === 'phase1_borewell_fill';
  const isStageB = currentPhase === 'phase3_network_propagation' || currentPhase === 'phase4_steady_irrigation' || currentPhase === 'phase2_pond_suction';

  const getPhaseBadge = () => {
    switch (currentPhase) {
      case 'idle':
        return simulationMode === 'irrigate-now'
          ? { label: '⏸️ Ready — Pond pre-filled 450,000L. Press Play for immediate 10HP submersible fertigation.', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-700' }
          : { label: '⏸️ Ready — Shift 1 (0h–2h): Borewell Fill → Shift 2 (2h+): 10HP Submersible Fertigation.', color: 'bg-slate-800 text-slate-300 border-slate-700' };
      case 'phase1_borewell_fill':
        return { label: '⚙️ Shift 1 (0h–2h): 2 × 7.5HP Borewells Pumping to Storage Pond (+19,714 L/hr) | Fertigation OFF', color: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 animate-pulse' };
      case 'phase2_pond_suction':
        return { label: '🌊 Shift 2 (2h+): 10HP Submersible Pump → Fertigation Unit | Borewells OFF', color: 'bg-purple-950/80 text-purple-300 border-purple-500/50 animate-pulse' };
      case 'phase3_network_propagation':
        return { label: '💧 Shift 2 (2h+): 10HP Submersible Fertigation → Pipelines → 1,300 Trees (-35,168 L/hr) | Borewells OFF', color: 'bg-blue-950/80 text-blue-300 border-blue-500/50 animate-pulse' };
      case 'phase4_steady_irrigation':
        return { label: '🌴 Shift 2: All 1,300+ Trees Hydrated & Dosing Active | Borewells OFF', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' };
    }
  };

  const badge = getPhaseBadge();
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    }
    return `${mins.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-11/12 max-w-4xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 rounded-2xl shadow-2xl p-4 text-white select-none">
      {/* Top Telemetry & Phase Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              {isPlaying && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isPlaying ? 'bg-cyan-500' : 'bg-slate-500'}`}></span>
            </span>
            <span className="font-bold text-sm text-slate-200 uppercase tracking-wider">Hydraulic Physics Simulation</span>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono text-slate-300">
          <div>⏱️ Elapsed: <span className="text-cyan-400 font-bold">{formatTime(elapsedSeconds)}</span></div>
          <div>⚡ Speed: <span className="text-amber-400 font-bold">{speed}x</span></div>
        </div>
      </div>

      {/* Real-time Progress Bar & Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        {/* Pond Gauge — filling (Stage A) or draining (Stage B) */}
        <div className={`bg-slate-800/80 p-2.5 rounded-xl border ${isStageB ? 'border-purple-500/30' : 'border-cyan-500/20'}`}>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400 font-medium">
              {isStageB ? '🌀 Pond Draining (Sub ON)' : '🌊 Pond Level'}
            </span>
            <span className={`font-bold ${isStageB ? 'text-purple-400' : 'text-cyan-400'}`}>{fillPercent}%</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden mb-1">
            <div
              className={`h-2 transition-all duration-300 rounded-full bg-gradient-to-r ${isStageB ? 'from-purple-600 to-violet-400' : 'from-cyan-600 to-blue-400'}`}
              style={{ width: `${fillPercent}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 font-mono text-right">
            {Math.round(pondVolumeLiters).toLocaleString()} / {maxPondCapacityLiters.toLocaleString()} L
            {isStageB && <span className="text-purple-400 ml-1">↓ -{(35168/3600).toFixed(1)} L/s</span>}
            {isStageA && <span className="text-cyan-400 ml-1">↑ +{(19714/3600).toFixed(1)} L/s</span>}
          </div>
        </div>

        {/* Tree Hydration Gauge */}
        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-emerald-500/20">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400 font-medium">🌴 Hydrated Trees</span>
            <span className="text-emerald-400 font-bold">
              {totalTreeCount > 0 ? Math.round((activeTreeCount / totalTreeCount) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden mb-1">
            <div
              className="bg-gradient-to-r from-emerald-600 to-teal-400 h-2 transition-all duration-300 rounded-full"
              style={{ width: `${totalTreeCount > 0 ? (activeTreeCount / totalTreeCount) * 100 : 0}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 font-mono text-right">
            {Math.floor(activeTreeCount).toLocaleString()} / {totalTreeCount.toLocaleString()} Trees
          </div>
        </div>

        {/* Flow Rate — Inflow during Stage A, Outflow during Stage B */}
        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-purple-500/20">
          <div className="text-xs text-slate-400 mb-0.5">
            {isStageA ? '⬆️ Borewell Inflow (2 Motors)' : '⬇️ Submersible Outflow'}
          </div>
          <div className="text-base font-bold text-purple-300 font-mono">
            {isStageA ? '19,714' : (Math.round(farmFlowLph) || 35168).toLocaleString()} <span className="text-xs font-normal text-slate-400">L/hr</span>
          </div>
          <div className="text-[10px] text-purple-400 font-mono">
            {isStageA ? '(328.6 LPM — Borewells ON)' : `(${(farmFlowLph / 60).toFixed(0)} LPM — Fertigation ON)`}
          </div>
        </div>

        {/* Total Water Delivered */}
        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-amber-500/20">
          <div className="text-xs text-slate-400 mb-0.5">🚰 Total Delivered</div>
          <div className="text-base font-bold text-amber-300 font-mono">
            {Math.round(totalWaterDeliveredLiters).toLocaleString()} <span className="text-xs font-normal text-slate-400">L</span>
          </div>
          <div className="text-[10px] text-amber-400 font-mono">
            Target: 150 L/tree/day
          </div>
        </div>
      </div>

      {/* Controls Bar: Mode Toggle | Play/Pause | Reset | Speed */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">

        {/* ── Simulation Mode Toggle ── */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-700 gap-1">
          <span className="text-[10px] text-slate-400 font-medium px-2 uppercase tracking-wider whitespace-nowrap">Mode:</span>
          <button
            onClick={() => !isPlaying && onSetMode('fill-then-drip')}
            disabled={isPlaying}
            title="Full day cycle: Borewells fill pond from 500L → 50,000L then irrigation starts (AP 9-hr window demo)"
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              simulationMode === 'fill-then-drip'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800 disabled:opacity-40'
            }`}
          >
            ⚙️ Fill → Drip
          </button>
          <button
            onClick={() => !isPlaying && onSetMode('irrigate-now')}
            disabled={isPlaying}
            title="Pond pre-filled 450,000L — irrigation starts immediately, all 1,300 trees hydrated within AP 9-hr window"
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              simulationMode === 'irrigate-now'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800 disabled:opacity-40'
            }`}
          >
            💧 Irrigate Now
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {/* Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center space-x-2 shadow-lg transition-all active:scale-95 ${
              isPlaying
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 ring-2 ring-amber-400/50'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-600 hover:to-blue-700 ring-2 ring-cyan-400/50'
            }`}
          >
            <span>{isPlaying ? '⏸️ Pause Flow' : '▶️ Run Simulation'}</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition-all active:scale-95 flex items-center space-x-1"
            title={simulationMode === 'irrigate-now' ? 'Reset pond to 450,000L (pre-filled)' : 'Reset pond to 500L (empty start)'}
          >
            <span>🔄 Reset {simulationMode === 'irrigate-now' ? '(450k L)' : '(500 L)'}</span>
          </button>
        </div>

        {/* Speed Multiplier Pill Selectors */}
        <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-medium px-2 uppercase tracking-wider">Speed:</span>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                speed === s
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
