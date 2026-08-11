"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import InfrastructureToolbox from '../components/InfrastructureToolbox';
import TreeInspector from '../components/TreeInspector';
import { runHydraulicSimulation, ClosedLoopSimulationResult } from '../../lib/simulation';
import { FarmData, Tree, PlacableComponent, PlacementTool } from '../../types/farm';

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

  // Save State
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Viewport State
  const [scale, setScale] = useState(0.85);
  const [position, setPosition] = useState({ x: 100, y: 50 });

  // Load farm data & infrastructure components from server with priority fallback
  useEffect(() => {
    fetch('/farm_data.json?v=' + Date.now())
      .then((res) => res.json())
      .then((serverData: FarmData) => {
        let finalData = serverData;
        let finalComponents = serverData.customComponents || [];

        // Check if user has saved manual edits in localStorage
        const saved = typeof window !== 'undefined' ? localStorage.getItem('madhu_coco_farm_saved_data') : null;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.farmData && Array.isArray(parsed.farmData.trees) && parsed.farmData.trees.length > 0) {
              finalData = parsed.farmData;
            }
            if (parsed.customComponents && Array.isArray(parsed.customComponents) && parsed.customComponents.length >= (serverData.customComponents || []).length) {
              finalComponents = parsed.customComponents;
            }
          } catch (err: unknown) {
            console.error('Failed to parse local storage:', err);
          }
        }

        finalData.trees.forEach((t: Tree) => { t.age_years = 5; });
        queueMicrotask(() => {
          setFarmData(finalData);
          setCustomComponents(finalComponents);
        });
      })
      .catch((err: unknown) => console.error('Error loading farm data:', err));
  }, []);

  // Compute hydraulic simulation result reactively without setting state in an effect
  const simulationResult: ClosedLoopSimulationResult | null = useMemo(() => {
    if (!farmData) return null;
    return runHydraulicSimulation(farmData, customComponents);
  }, [farmData, customComponents]);

  // Save layout helper directly to disk file and local storage
  const handleSaveLayout = async () => {
    if (!farmData) return;
    setIsSaving(true);
    setSaveStatus('Saving layout...');

    const payload = { farmData, customComponents };
    if (typeof window !== 'undefined') {
      localStorage.setItem('madhu_coco_farm_saved_data', JSON.stringify(payload));
    }

    try {
      const res = await fetch('/api/save_farm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus(`Saved ${farmData.trees.length} trees & ${customComponents.length} components!`);
      } else {
        setSaveStatus('Saved locally!');
      }
    } catch {
      setSaveStatus('Saved locally to browser!');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('madhu_coco_farm_saved_data', JSON.stringify({ farmData: updatedData, customComponents }));
    }
  }, [farmData, customComponents]);

  const handleDeleteComponent = useCallback((compId: string) => {
    const updated = customComponents.filter(c => c.id !== compId);
    setCustomComponents(updated);
    setSelectedComponent(null);
    if (farmData && typeof window !== 'undefined') {
      localStorage.setItem('madhu_coco_farm_saved_data', JSON.stringify({ farmData, customComponents: updated }));
    }
  }, [farmData, customComponents]);

  const handleUpdateComponent = (updated: PlacableComponent) => {
    const nextComps = customComponents.map(c => c.id === updated.id ? updated : c);
    setCustomComponents(nextComps);
    setSelectedComponent(updated);
    if (farmData && typeof window !== 'undefined') {
      localStorage.setItem('madhu_coco_farm_saved_data', JSON.stringify({ farmData, customComponents: nextComps }));
    }
  };

  const handleUpdateTree = useCallback((updated: Tree) => {
    if (!farmData) return;
    const nextTrees = farmData.trees.map(t => t.id === updated.id ? updated : t);
    const updatedData = { ...farmData, trees: nextTrees };
    setFarmData(updatedData);
    setSelectedTree(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('madhu_coco_farm_saved_data', JSON.stringify({ farmData: updatedData, customComponents }));
    }
  }, [farmData, customComponents]);

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
    if (typeof window !== 'undefined') {
      localStorage.setItem('madhu_coco_farm_saved_data', JSON.stringify({ farmData: updatedData, customComponents }));
    }
  }, [farmData, customComponents, selectedTree]);

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
        🌴 Loading Plantation Twin...
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
          if (typeof window !== 'undefined') {
            localStorage.setItem('madhu_coco_farm_saved_data', JSON.stringify({ farmData, customComponents: comps }));
          }
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
        onSaveLayout={handleSaveLayout}
        onApplyUniversalHoles={handleApplyUniversalHoles}
        isSaving={isSaving}
        saveStatus={saveStatus}
        simulationResult={simulationResult}
        scale={scale}
        treeCount={farmData.trees.length}
        placedCount={customComponents.length}
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
    </main>
  );
}
