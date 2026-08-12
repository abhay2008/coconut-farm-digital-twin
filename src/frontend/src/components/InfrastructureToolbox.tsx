"use client";

import React from 'react';
import { PlacementTool } from '../../types/farm';
import { ClosedLoopSimulationResult } from '../../lib/simulation';

interface ToolboxProps {
  showPipes: boolean;
  setShowPipes: (v: boolean) => void;
  showHeatmap: boolean;
  setShowHeatmap: (v: boolean) => void;
  showMainlines: boolean;
  setShowMainlines: (v: boolean) => void;
  showSublines: boolean;
  setShowSublines: (v: boolean) => void;
  showLadders: boolean;
  setShowLadders: (v: boolean) => void;
  showDripLoops: boolean;
  setShowDripLoops: (v: boolean) => void;
  showBorewellLines: boolean;
  setShowBorewellLines: (v: boolean) => void;
  bgOpacity: number;
  setBgOpacity: (v: number) => void;
  highContrastPipes: boolean;
  setHighContrastPipes: (v: boolean) => void;
  activeTool: PlacementTool;
  setActiveTool: (t: PlacementTool) => void;
  runSimulation: () => void;
  onSaveLayout: () => void;
  onApplyUniversalHoles?: (count: number) => void;
  isSaving?: boolean;
  saveStatus?: string | null;
  simulationResult?: ClosedLoopSimulationResult | null;
  scale: number;
  treeCount: number;
  placedCount: number;
  activeBranchName?: string;
  onOpenBranchManager?: () => void;
}

const InfrastructureToolbox: React.FC<ToolboxProps> = ({
  showHeatmap, setShowHeatmap,
  showMainlines, setShowMainlines,
  showSublines, setShowSublines,
  showLadders, setShowLadders,
  showDripLoops, setShowDripLoops,
  showBorewellLines, setShowBorewellLines,
  bgOpacity, setBgOpacity,
  highContrastPipes, setHighContrastPipes,
  activeTool, setActiveTool,
  runSimulation,
  onSaveLayout,
  onApplyUniversalHoles,
  isSaving,
  saveStatus,
  simulationResult,
  scale,
  treeCount,
  placedCount,
  activeBranchName = 'main',
  onOpenBranchManager
}) => {
  const [universalHoles, setUniversalHoles] = React.useState(4);
  const tools: { id: PlacementTool; label: string; icon: string; bg: string }[] = [
    { id: 'select', label: 'Select / Inspect', icon: '🔍', bg: 'bg-blue-50 border-blue-400' },
    { id: 'borewell', label: 'Surface Borewell', icon: '🕳️', bg: 'bg-cyan-50 border-cyan-400' },
    { id: 'motor_7.5hp', label: '7.5 HP Surface Motor', icon: '⚙️', bg: 'bg-amber-50 border-amber-400' },
    { id: 'motor_10hp', label: '10 HP Submersible/Surface', icon: '⚡', bg: 'bg-red-50 border-red-400' },
    { id: 'subline_booster_motor', label: '7.5 HP Inline Booster', icon: '🚀', bg: 'bg-emerald-50 border-emerald-400' },
    { id: 'pond', label: '500kL Storage Pond', icon: '🌊', bg: 'bg-blue-50 border-blue-400' },
    { id: 'fertigation_unit', label: 'Fertigation Dosing Unit', icon: '🧪', bg: 'bg-purple-50 border-purple-400' },
    { id: 'main_pipe', label: '110mm Main Pipeline', icon: '🔴', bg: 'bg-rose-50 border-rose-400' },
    { id: 'subline', label: '75mm Subline Branch', icon: '🔵', bg: 'bg-sky-50 border-sky-400' },
    { id: 'ladder', label: '40mm Ladder Line', icon: '🟠', bg: 'bg-amber-50 border-amber-400' },
    { id: 'tree_drip_ring', label: '16mm Tree Drip Loop', icon: '🔄', bg: 'bg-sky-50 border-sky-400' },
    { id: 'control_valve', label: 'ON/OFF Valve', icon: '🚰', bg: 'bg-emerald-50 border-emerald-400' },
    { id: 't_valve', label: 'T-Valve Junction', icon: '🔀', bg: 'bg-amber-50 border-amber-400' },
    { id: 'end_cap', label: 'Pipe End-Cap', icon: '🛑', bg: 'bg-rose-50 border-rose-400' },
    { id: 'tree', label: 'New Coconut Tree', icon: '🌴', bg: 'bg-emerald-50 border-emerald-400' },
  ];

  return (
    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-2xl border border-gray-200 z-20 w-84 max-h-[94vh] overflow-y-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
          <span>🌴</span> Madhu Coco Farm
        </h3>
        <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full shadow-sm">
          {treeCount} Trees (29.4 Acres)
        </span>
      </div>

      {/* Active Branch Status Bar */}
      <div className="bg-slate-900 text-white p-2.5 rounded-lg border border-slate-700 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 truncate">
          <span className="text-blue-400 font-extrabold text-sm">🌿</span>
          <span className="text-slate-400 text-[11px]">Branch:</span>
          <span className="font-bold text-amber-300 truncate">
            {activeBranchName} {activeBranchName.toLowerCase() === 'main' && '🔒'}
          </span>
        </div>
        {onOpenBranchManager && (
          <button
            onClick={onOpenBranchManager}
            className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow transition-all whitespace-nowrap flex items-center gap-1"
          >
            <span>🔀</span> Switch / Manage
          </button>
        )}
      </div>

      {/* Save Status Notification */}
      {saveStatus && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between">
          <span>{saveStatus}</span>
        </div>
      )}

      {/* Primary Action Button: Save Layout Permanently */}
      <div>
        <button
          onClick={onSaveLayout}
          disabled={isSaving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
        >
          <span>💾</span> {isSaving ? 'Saving Layout...' : 'Save Layout Permanently'}
        </button>
      </div>

      {/* Placement Palette */}
      <div>
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1.5">
          🛠️ Component & Plumbing Tool
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {tools.map((t) => {
            const isActive = activeTool === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTool(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-300 scale-[1.02]'
                    : `${t.bg} text-gray-800 hover:brightness-95`
                }`}
              >
                <span className="text-sm">{t.icon}</span>
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>
        {activeTool !== 'select' && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 font-medium animate-pulse">
            {activeTool === 'main_pipe' || activeTool === 'subline' || activeTool === 'ladder'
              ? 'Click points to draw pipe line. Double-click to finish.'
              : `Click anywhere on map to place ${activeTool.replace('_', ' ')}.`}
          </div>
        )}
      </div>

      {/* Hydraulic & Fertigation Closed-Loop Simulation Summary */}
      {simulationResult && (
        <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-700 space-y-2.5 text-xs">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1.5 font-bold text-emerald-400">
            <span>⚡ 9-Hr Power & 150L/Tree Engineering</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded font-extrabold">
              {simulationResult.sustainableStatus || "OPTIMAL"} 🟢
            </span>
          </div>

          {/* 1. 9-Hour 3-Phase Power Schedule & 150L/Tree Daily Target */}
          <div className="bg-emerald-950/40 border border-emerald-800/60 p-2.5 rounded-lg space-y-1.5 text-[10px]">
            <div className="flex justify-between items-center">
              <span className="text-emerald-300 font-bold uppercase">⏱️ 9-Hr Power Schedule (150L / Tree / Day)</span>
              <span className="text-amber-300 font-bold">{simulationResult.irrigationTimeRequiredHours || 4.69} hrs / 9.0 hrs</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[9.5px]">
              <div className="bg-slate-800/90 p-1.5 rounded">
                <span className="text-slate-400 block">Daily Farm Demand</span>
                <span className="font-bold text-emerald-300">{(simulationResult.dailyFarmWaterRequiredLiters || 164850).toLocaleString()} Liters</span>
              </div>
              <div className="bg-slate-800/90 p-1.5 rounded">
                <span className="text-slate-400 block">Power Window Buffer</span>
                <span className="font-bold text-amber-300">+{(simulationResult.powerBufferRemainingHours || 4.31)} hrs Surplus</span>
              </div>
            </div>
          </div>

          {/* 2. Real-World Equipment Classification (1x Submersible Pond Pump + 7x Surface Well Pumps) */}
          <div className="bg-blue-950/60 border border-blue-800/60 p-2 rounded space-y-1 text-[10px]">
            <div className="flex justify-between items-center text-blue-300 font-bold">
              <span>⚙️ Real-World Equipment Split</span>
              <span className="text-cyan-300 font-extrabold">🌊 1 Submersible / ⚙️ 8 Surface</span>
            </div>
            <div className="text-[9.5px] space-y-0.5 text-slate-200">
              <div className="flex justify-between">
                <span>🌊 Pond Extraction Pump:</span>
                <span className="font-bold text-cyan-300">1x 10 HP Submersible (In Pond)</span>
              </div>
              <div className="flex justify-between">
                <span>⚙️ Borewell Wellhead Pumps:</span>
                <span className="font-bold text-amber-300">7x Surface Monoblock Pumps</span>
              </div>
              <div className="flex justify-between">
                <span>🚀 Subline Booster Pump:</span>
                <span className="font-bold text-emerald-300">1x 7.5 HP Surface Booster</span>
              </div>
            </div>
          </div>

          {/* 3. 7 Borewells Spatial Motor Allocation (2x 10HP + 5x 7.5HP) */}
          <div className="bg-cyan-950/40 border border-cyan-800/60 p-2 rounded space-y-1 text-[10px]">
            <div className="flex justify-between items-center text-cyan-300 font-bold">
              <span>🕳️ 7 Borewells Spatial Motors</span>
              <span className="text-cyan-200">{(simulationResult.pondInflowLph || 69000).toLocaleString()} L/hr Inflow</span>
            </div>
            <div className="flex justify-between text-[9px] text-cyan-200/80">
              <span>2x 10 HP Surface (Deep Furthest)</span>
              <span>5x 7.5 HP Surface (Mid Wells)</span>
            </div>
          </div>

          {/* 3. Subline 7.5 HP Inline Booster Motor */}
          <div className="bg-amber-950/40 border border-amber-800/60 p-2 rounded space-y-1 text-[10px]">
            <div className="flex justify-between items-center text-amber-300 font-bold">
              <span>🚀 7.5 HP Subline Booster Motor</span>
              <span className="text-emerald-400 font-extrabold">+{(simulationResult.sublineBoosterStatus?.pressureBoostBar || 1.5)} bar Boost</span>
            </div>
            <div className="text-[9px] text-slate-300">
              Pipeline Sizing: Main 110mm PVC $\to$ Subline 75mm $\to$ Ladder 40mm $\to$ Closed-End Loop 16mm
            </div>
          </div>

          {/* 4. Fertigation Dosing & Storage Balance */}
          <div className="bg-purple-950/60 border border-purple-800/60 p-2 rounded space-y-1 text-[10px]">
            <div className="flex justify-between items-center text-purple-300 font-bold">
              <span>🧪 Fertigation Concentration</span>
              <span className="text-purple-200">{simulationResult.fertigationPpm || 1400} ppm</span>
            </div>
            <div className="flex justify-between text-[9px] text-purple-200/80">
              <span>Pond Storage: {simulationResult.pondFillLevelPercent || 90}% ({((simulationResult.pondWaterLevelLiters || 450000) / 1000).toLocaleString()} m³)</span>
              <span>Nutrient/Tree: {simulationResult.nutrientGramsPerHourPerTree || 45} g/hr</span>
            </div>
          </div>

          {/* 5. Farm Totals */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-800/80 p-2 rounded">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Total Farm Flow</span>
              <span className="font-bold text-emerald-300 text-xs">
                {simulationResult.totalFarmFlowLph?.toLocaleString()} L/hr
              </span>
              <span className="block text-[9px] text-slate-400">({simulationResult.totalFarmM3PerHour} m³/hr)</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded">
              <span className="text-slate-400 block text-[9px] uppercase font-bold">Per-Tree Delivery</span>
              <span className="font-bold text-cyan-300 text-xs">
                {simulationResult.avgTreeFlowLph} L/hr
              </span>
              <span className="block text-[9px] text-slate-400">({(simulationResult.avgTreeFlowLph * 2).toFixed(1)} L / 2-hr run)</span>
            </div>
          </div>
        </div>
      )}

      {/* Universal Dripper / Hole Control */}
      <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-lg space-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <label className="font-bold text-sky-900 uppercase tracking-wider text-[10px]">
            🌐 Universal Drippers Per Tree
          </label>
          <span className="font-bold text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-300">
            {universalHoles} Holes
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="1"
            max="16"
            step="1"
            value={universalHoles}
            onChange={(e) => setUniversalHoles(parseInt(e.target.value) || 4)}
            className="flex-1 h-1.5 bg-sky-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
          />
          {onApplyUniversalHoles && (
            <button
              onClick={() => onApplyUniversalHoles(universalHoles)}
              className="bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow transition-all whitespace-nowrap"
            >
              Set All ({treeCount})
            </button>
          )}
        </div>
      </div>

      {/* Visual Contrast & Map Background Control */}
      <div className="bg-indigo-50/80 border border-indigo-200 p-2.5 rounded-lg space-y-2 text-xs">
        <label className="font-bold text-indigo-900 uppercase tracking-wider block text-[10px]">
          🎨 Visual Visibility & Map Contrast
        </label>

        {/* Map Background Opacity Slider */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-[10.5px]">
            <span className="text-indigo-800 font-semibold">🗺️ Satellite Map Opacity</span>
            <span className="font-bold text-indigo-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200">
              {Math.round(bgOpacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={bgOpacity}
            onChange={e => setBgOpacity(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        {/* High-Contrast Pipe Mode Toggle */}
        <label className="flex items-center justify-between p-1.5 bg-white rounded border border-indigo-200 cursor-pointer text-[11px]">
          <span className="font-bold text-indigo-950 flex items-center gap-1.5">
            ✨ High-Contrast Pipe Mode
          </span>
          <input
            type="checkbox"
            checked={highContrastPipes}
            onChange={e => setHighContrastPipes(e.target.checked)}
            className="accent-indigo-600 w-4 h-4 cursor-pointer"
          />
        </label>
      </div>

      {/* Layer Toggles */}
      <div className="bg-gray-50 p-2.5 rounded-lg border space-y-2 text-xs">
        <label className="font-bold text-gray-700 uppercase tracking-wider block text-[10px]">
          👁️ Pipeline & Infrastructure Filters
        </label>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <label className="flex items-center space-x-1.5 text-gray-700 cursor-pointer">
            <input type="checkbox" checked={showMainlines} onChange={e => setShowMainlines(e.target.checked)} className="accent-rose-600" />
            <span>🔴 Mainlines (110mm)</span>
          </label>
          <label className="flex items-center space-x-1.5 text-gray-700 cursor-pointer">
            <input type="checkbox" checked={showSublines} onChange={e => setShowSublines(e.target.checked)} className="accent-sky-600" />
            <span>🔵 Sublines (75mm)</span>
          </label>
          <label className="flex items-center space-x-1.5 text-gray-700 cursor-pointer">
            <input type="checkbox" checked={showLadders} onChange={e => setShowLadders(e.target.checked)} className="accent-amber-600" />
            <span>🟠 Ladders (40mm)</span>
          </label>
          <label className="flex items-center space-x-1.5 text-gray-700 cursor-pointer">
            <input type="checkbox" checked={showDripLoops} onChange={e => setShowDripLoops(e.target.checked)} className="accent-blue-600" />
            <span>🔄 Drip Loops (16mm)</span>
          </label>
          <label className="flex items-center space-x-1.5 text-gray-700 cursor-pointer col-span-2">
            <input type="checkbox" checked={showBorewellLines} onChange={e => setShowBorewellLines(e.target.checked)} className="accent-cyan-600" />
            <span>💧 Well & Pond Lines</span>
          </label>
          <label className="flex items-center space-x-1.5 text-gray-700 cursor-pointer col-span-2 pt-1 border-t">
            <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} className="accent-purple-600" />
            <span className="font-bold text-purple-700">🌡️ Pressure Heatmap</span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <button 
        onClick={runSimulation}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-lg font-bold text-xs shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
      >
        <span>⚡</span> Run Hydraulic Simulation
      </button>

      {/* Footer info */}
      <div className="flex items-center justify-between pt-1.5 border-t text-[11px] text-gray-500">
        <span>Zoom: {scale.toFixed(2)}x</span>
        <span>Placed Components: {placedCount}</span>
      </div>
    </div>
  );
};

export default InfrastructureToolbox;
