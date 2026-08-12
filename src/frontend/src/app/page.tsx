"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import InfrastructureToolbox from '../components/InfrastructureToolbox';
import TreeInspector from '../components/TreeInspector';
import SaveLayoutModal from '../components/SaveLayoutModal';
import BranchManagerModal from '../components/BranchManagerModal';
import { LiveSimulationControlBar, SimulationPhase } from '../components/LiveSimulationControlBar';
import { runHydraulicSimulation, ClosedLoopSimulationResult } from '../../lib/simulation';
import { FarmData, Tree, PlacableComponent, PlacementTool } from '../../types/farm';
import { fetchBranchPayload, saveBranch, deleteBranch } from '../../lib/branchStore';

// Dynamic import to prevent SSR canvas issues
const FarmCanvas = dynamic(() => import('../components/FarmCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-slate-900 flex items-center justify-center text-white font-bold text-lg">
      🌴 Loading Madhu Coco Farm Digital Twin...
    </div>
  )
});

export default function Home() {
  const [farmData, setFarmData] = useState<FarmData | null>(null);
  const [customComponents, setCustomComponents] = useState<PlacableComponent[]>([]);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [selectedComponent, setSelectedComponent] = useState<PlacableComponent | null>(null);

  // Branching & Versioning State
  const [activeBranchName, setActiveBranchName] = useState<string>('main');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isBranchManagerOpen, setIsBranchManagerOpen] = useState(false);

  // Layer Toggles
  const [showPipes, setShowPipes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showMainlines, setShowMainlines] = useState(true);
  const [showSublines, setShowSublines] = useState(true);
  const [showLadders, setShowLadders] = useState(true);
  const [showDripLoops, setShowDripLoops] = useState(true);
  const [showBorewellLines, setShowBorewellLines] = useState(true);
  const [bgOpacity, setBgOpacity] = useState(0.85);
  const [highContrastPipes, setHighContrastPipes] = useState(true);

  // Placement Tooling
  const [activeTool, setActiveTool] = useState<PlacementTool>('select');

  // Save Status Notification
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Viewport State
  const [scale, setScale] = useState(0.85);
  const [position, setPosition] = useState({ x: 100, y: 50 });

  // Real-Time Hydraulic Simulation Playback State (Starting at 500 Liters Initial Pond Level)
  const [isPlaying, setIsPlaying] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pondVolumeLiters, setPondVolumeLiters] = useState(500); // Initial 500 L as requested
  const [maxPondCapacityLiters] = useState(500000);
  const [totalWaterDeliveredLiters, setTotalWaterDeliveredLiters] = useState(0);
  const [activeTreeCount, setActiveTreeCount] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<SimulationPhase>('idle');
  const [animDashOffset, setAnimDashOffset] = useState(0);

  // Real-time animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const dt = 0.1 * simSpeed;
      setElapsedSeconds((prev) => prev + dt);
      setAnimDashOffset((prev) => (prev + 2.5 * simSpeed) % 100);

      setPondVolumeLiters((prevPond) => {
        const totalTrees = farmData?.trees?.length || 1300;

        // ─────────────────────────────────────────────────────────────────
        // STAGE A: Borewell Fill — borewells running, submersible is OFF
        // AP DTR 3-Phase Constraint: max 2 x 7.5HP motors concurrently
        // Inflow rate = 19,714 L/hr = 5.4761 L/sec
        // Pond fills from 500 L up to full 500,000 L capacity
        // Fertigation unit & distribution network are IDLE in this stage
        // ─────────────────────────────────────────────────────────────────
        if (prevPond < 500000) {
          setCurrentPhase('phase1_borewell_fill');
          setActiveTreeCount(0); // no irrigation during fill
          const apGridLps = 19714 / 3600; // 5.4761 L/sec (2 motors)
          return Math.min(500000, prevPond + apGridLps * dt);
        }

        // ─────────────────────────────────────────────────────────────────
        // CHANGEOVER: Pond is full (500,000 L)
        // Borewells shut OFF. 10 HP Submersible Pond Pump starts.
        // Fertigation dosing unit activates.
        // ─────────────────────────────────────────────────────────────────

        // ─────────────────────────────────────────────────────────────────
        // STAGE B: 10 HP Submersible Pump → Fertigation Unit → Pipelines → Trees
        // Outflow rate = 35,168 L/hr = 9.7689 L/sec
        // Pond volume DECREASES as water is drawn out and delivered to trees
        // Borewells are completely OFF in this stage
        // ─────────────────────────────────────────────────────────────────
        const submersibleLps = 35168 / 3600; // 9.7689 L/sec outflow
        const outflowThisTick = submersibleLps * dt;

        // Update tree wavefront propagation (0.06513 trees/sec = all trees in 5.54 hrs)
        setActiveTreeCount((prevTrees) => {
          if (prevTrees < totalTrees) {
            setCurrentPhase('phase3_network_propagation');
            return Math.min(totalTrees, prevTrees + 0.06513 * dt);
          }
          setCurrentPhase('phase4_steady_irrigation');
          return totalTrees;
        });

        setTotalWaterDeliveredLiters((prev) => prev + outflowThisTick);

        // Pond drains — stop simulation when pond reaches 0
        const newPond = prevPond - outflowThisTick;
        if (newPond <= 0) {
          setCurrentPhase('idle');
          setIsPlaying(false);
          return 0;
        }
        return newPond;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, simSpeed, farmData]);

  const handleTogglePlay = () => {
    if (!isPlaying && currentPhase === 'idle') {
      setCurrentPhase('phase1_borewell_fill');
    }
    setIsPlaying(!isPlaying);
  };

  const handleResetSimulation = () => {
    setIsPlaying(false);
    setElapsedSeconds(0);
    setPondVolumeLiters(500); // Reset to 500L initial state
    setTotalWaterDeliveredLiters(0);
    setActiveTreeCount(0);
    setCurrentPhase('idle');
    setAnimDashOffset(0);
  };

  // On website open, ALWAYS load the main branch layout by default
  useEffect(() => {
    async function loadInitialMainBranch() {
      try {
        const mainPayload = await fetchBranchPayload('main');
        if (mainPayload && mainPayload.farmData && Array.isArray(mainPayload.farmData.trees) && mainPayload.farmData.trees.length > 0) {
          mainPayload.farmData.trees.forEach((t: Tree) => { if (!t.age_years) t.age_years = 5; });
          setFarmData(mainPayload.farmData);
          setCustomComponents(mainPayload.customComponents || []);
          setActiveBranchName('main');
          return;
        }
      } catch (e) {
        console.warn('Could not fetch main branch payload from branchStore, using fallback:', e);
      }

      // Default fallback if main branch payload is not yet stored
      fetch('/farm_data.json?v=' + Date.now())
        .then((res) => res.json())
        .then((serverData: FarmData) => {
          serverData.trees.forEach((t: Tree) => { if (!t.age_years) t.age_years = 5; });
          setFarmData(serverData);
          setCustomComponents(serverData.customComponents || []);
          setActiveBranchName('main');
        })
        .catch((err: unknown) => console.error('Error loading fallback farm data:', err));
    }

    loadInitialMainBranch();
  }, []);

  // Compute hydraulic simulation result reactively without setting state in an effect
  const simulationResult: ClosedLoopSimulationResult | null = useMemo(() => {
    if (!farmData) return null;
    return runHydraulicSimulation(farmData, customComponents);
  }, [farmData, customComponents]);

  // Open Save Layout Modal
  const handleOpenSaveModal = () => {
    setIsSaveModalOpen(true);
  };

  // Handler: Save layout to a custom branch
  const handleSaveAsBranch = async (branchName: string) => {
    if (!farmData) return;
    setIsSaving(true);
    try {
      const res = await saveBranch(branchName, farmData, customComponents);
      if (res.success) {
        setActiveBranchName(branchName);
        setSaveStatus(res.message);
      } else {
        throw new Error(res.message);
      }
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3500);
    }
  };

  // Handler: Save layout to Main branch (Password 666 required)
  const handleSaveToMain = async (password: string) => {
    if (!farmData) return;
    setIsSaving(true);
    try {
      const res = await saveBranch('main', farmData, customComponents, password);
      if (res.success) {
        setActiveBranchName('main');
        setSaveStatus(res.message);
      } else {
        throw new Error(res.message);
      }
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3500);
    }
  };

  // Handler: Switch/Load a branch layout
  const handleSelectBranch = async (branchName: string) => {
    setIsSaving(true);
    try {
      const payload = await fetchBranchPayload(branchName);
      if (payload && payload.farmData) {
        payload.farmData.trees.forEach((t: Tree) => { if (!t.age_years) t.age_years = 5; });
        setFarmData(payload.farmData);
        setCustomComponents(payload.customComponents || []);
        setActiveBranchName(payload.name);
        setSelectedTree(null);
        setSelectedComponent(null);
        setSaveStatus(`Loaded branch '${payload.name}'`);
      } else {
        throw new Error(`Could not load data for branch '${branchName}'`);
      }
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Handler: Delete a branch (Password 666 required for main to reset)
  const handleDeleteBranch = async (branchName: string, password?: string) => {
    const res = await deleteBranch(branchName, password);
    if (!res.success) {
      throw new Error(res.message);
    }
    setSaveStatus(res.message);
    setTimeout(() => setSaveStatus(null), 3000);

    // If current active branch was deleted, switch back to main
    if (activeBranchName.toLowerCase() === branchName.toLowerCase()) {
      await handleSelectBranch('main');
    }
  };

  const handleRunSimulation = useCallback(() => {
    setShowHeatmap(true);
  }, []);

  const handleDeleteTree = useCallback((treeId: string) => {
    if (!farmData) return;
    const updatedTrees = farmData.trees.filter(t => t.id !== treeId);
    const updatedData = { ...farmData, trees: updatedTrees };
    setFarmData(updatedData);
    setSelectedTree(null);
  }, [farmData]);

  const handleDeleteComponent = useCallback((compId: string) => {
    const updated = customComponents.filter(c => c.id !== compId);
    setCustomComponents(updated);
    setSelectedComponent(null);
  }, [customComponents]);

  const handleUpdateComponent = (updated: PlacableComponent) => {
    const nextComps = customComponents.map(c => c.id === updated.id ? updated : c);
    setCustomComponents(nextComps);
    setSelectedComponent(updated);
  };

  const handleUpdateTree = useCallback((updated: Tree) => {
    if (!farmData) return;
    const nextTrees = farmData.trees.map(t => t.id === updated.id ? updated : t);
    const updatedData = { ...farmData, trees: nextTrees };
    setFarmData(updatedData);
    setSelectedTree(updated);
  }, [farmData]);

  const handleApplyUniversalHoles = useCallback((holeCount: number) => {
    if (!farmData) return;
    const nextTrees = farmData.trees.map(t => ({ ...t, dripper_count: holeCount }));
    const updatedData = { ...farmData, trees: nextTrees };
    setFarmData(updatedData);
    if (selectedTree) {
      setSelectedTree({ ...selectedTree, dripper_count: holeCount });
    }
    setSaveStatus(`Applied ${holeCount} dripper holes to all ${nextTrees.length} trees!`);
    setTimeout(() => setSaveStatus(null), 3000);
  }, [farmData, selectedTree]);

  // Keyboard Delete / Backspace Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeElem = document.activeElement;
        if (activeElem && (activeElem.tagName === 'INPUT' || activeElem.tagName === 'TEXTAREA')) {
          return;
        }
        if (selectedTree) {
          handleDeleteTree(selectedTree.id);
        } else if (selectedComponent) {
          handleDeleteComponent(selectedComponent.id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTree, selectedComponent, handleDeleteTree, handleDeleteComponent]);

  if (!farmData) {
    return (
      <div className="w-full h-screen bg-slate-900 flex items-center justify-center text-white font-bold text-lg">
        🌴 Loading Plantation Digital Twin...
      </div>
    );
  }

  return (
    <main className="relative w-full h-screen overflow-hidden bg-slate-950 select-none">
      {/* Konva Interactive Canvas */}
      <FarmCanvas 
        farmData={farmData}
        customComponents={customComponents}
        onUpdateComponents={(comps) => {
          setCustomComponents(comps);
        }}
        simulationResult={simulationResult}
        showHeatmap={showHeatmap}
        showMainlines={showMainlines}
        showSublines={showSublines}
        showLadders={showLadders}
        showDripLoops={showDripLoops}
        showBorewellLines={showBorewellLines}
        bgOpacity={bgOpacity}
        highContrastPipes={highContrastPipes}
        activeTool={activeTool}
        onSelectTree={(t) => { setSelectedTree(t); setSelectedComponent(null); }}
        onSelectComponent={(c) => { setSelectedComponent(c); setSelectedTree(null); }}
        selectedComponentId={selectedComponent?.id || null}
        selectedTreeId={selectedTree?.id || null}
        scale={scale}
        setScale={setScale}
        position={position}
        setPosition={setPosition}
        isPlaying={isPlaying}
        animDashOffset={animDashOffset}
        currentPhase={currentPhase}
        pondVolumeLiters={pondVolumeLiters}
        activeTreeCount={activeTreeCount}
      />

      {/* Top-Right Work In Progress Sign */}
      <div className="absolute top-4 right-4 z-40 bg-amber-500/95 text-slate-950 px-4 py-2 rounded-xl font-extrabold text-xs tracking-wide shadow-xl border border-amber-300/80 backdrop-blur-md flex items-center space-x-2 select-none">
        <span className="animate-pulse text-sm">🚧</span>
        <span>WORK IN PROGRESS (Do Not Touch Main Branch)</span>
      </div>

      {/* Real-Time Live Hydraulic Physics Simulation Control Bar */}
      <LiveSimulationControlBar
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onReset={handleResetSimulation}
        speed={simSpeed}
        onSetSpeed={setSimSpeed}
        currentPhase={currentPhase}
        pondVolumeLiters={pondVolumeLiters}
        maxPondCapacityLiters={maxPondCapacityLiters}
        elapsedSeconds={elapsedSeconds}
        totalWaterDeliveredLiters={totalWaterDeliveredLiters}
        activeTreeCount={activeTreeCount}
        totalTreeCount={farmData.trees.length}
        farmFlowLph={simulationResult?.totalFarmFlowLph || 35168}
      />

      {/* Floating Infrastructure & Component Placement Toolbox */}
      <InfrastructureToolbox
        showPipes={showPipes}
        setShowPipes={setShowPipes}
        showHeatmap={showHeatmap}
        setShowHeatmap={setShowHeatmap}
        showMainlines={showMainlines}
        setShowMainlines={setShowMainlines}
        showSublines={showSublines}
        setShowSublines={setShowSublines}
        showLadders={showLadders}
        setShowLadders={setShowLadders}
        showDripLoops={showDripLoops}
        setShowDripLoops={setShowDripLoops}
        showBorewellLines={showBorewellLines}
        setShowBorewellLines={setShowBorewellLines}
        bgOpacity={bgOpacity}
        setBgOpacity={setBgOpacity}
        highContrastPipes={highContrastPipes}
        setHighContrastPipes={setHighContrastPipes}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        runSimulation={handleRunSimulation}
        onSaveLayout={handleOpenSaveModal}
        onApplyUniversalHoles={handleApplyUniversalHoles}
        isSaving={isSaving}
        saveStatus={saveStatus}
        simulationResult={simulationResult}
        scale={scale}
        treeCount={farmData.trees.length}
        placedCount={customComponents.length}
        activeBranchName={activeBranchName}
        onOpenBranchManager={() => setIsBranchManagerOpen(true)}
      />

      {/* Slide-out Inspector Modal */}
      {(selectedTree || selectedComponent) && (
        <TreeInspector
          tree={selectedTree}
          component={selectedComponent}
          onClose={() => { setSelectedTree(null); setSelectedComponent(null); }}
          onDeleteTree={handleDeleteTree}
          onDeleteComponent={handleDeleteComponent}
          onUpdateTree={handleUpdateTree}
          onUpdateComponent={handleUpdateComponent}
          pressure={selectedTree ? simulationResult?.treePressures[selectedTree.id] : undefined}
          flowLph={selectedTree ? simulationResult?.treeFlowLph[selectedTree.id] : undefined}
        />
      )}

      {/* Save Layout Modal (Save as Branch vs Save to Main with password 666) */}
      <SaveLayoutModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSaveBranch={handleSaveAsBranch}
        onSaveMain={handleSaveToMain}
        currentBranch={activeBranchName}
      />

      {/* Branch Version Manager Modal */}
      <BranchManagerModal
        isOpen={isBranchManagerOpen}
        onClose={() => setIsBranchManagerOpen(false)}
        currentBranch={activeBranchName}
        onSelectBranch={handleSelectBranch}
        onDeleteBranch={handleDeleteBranch}
      />
    </main>
  );
}
