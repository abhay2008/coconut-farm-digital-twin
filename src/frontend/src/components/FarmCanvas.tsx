import React, { useState, useRef } from 'react';
import { Stage, Layer, Circle, Line, Text, Rect, Group, Image as KonvaImage, Ring } from 'react-konva';
import useImage from 'use-image';
import Konva from 'konva';
import { FarmData, Tree, PlacableComponent, PlacementTool } from '../../types/farm';
import { ClosedLoopSimulationResult } from '../../lib/simulation';

interface FarmCanvasProps {
  farmData: FarmData;
  customComponents: PlacableComponent[];
  onUpdateComponents: (comps: PlacableComponent[]) => void;
  simulationResult: ClosedLoopSimulationResult | null;
  showHeatmap: boolean;
  showMainlines?: boolean;
  showSublines?: boolean;
  showLadders?: boolean;
  showDripLoops?: boolean;
  showBorewellLines?: boolean;
  bgOpacity?: number;
  highContrastPipes?: boolean;
  activeTool: PlacementTool;
  onSelectTree: (tree: Tree | null) => void;
  onSelectComponent: (comp: PlacableComponent | null) => void;
  selectedComponentId: string | null;
  selectedTreeId: string | null;
  scale: number;
  setScale: (s: number) => void;
  position: { x: number, y: number };
  setPosition: (pos: { x: number, y: number }) => void;
  
  // Real-Time Simulation Playback Animation Props
  isPlaying?: boolean;
  animDashOffset?: number;
  currentPhase?: string;
  pondVolumeLiters?: number;
  activeTreeCount?: number;
}

const FarmCanvas: React.FC<FarmCanvasProps> = ({
  farmData,
  customComponents,
  onUpdateComponents,
  simulationResult,
  showHeatmap,
  showMainlines = true,
  showSublines = true,
  showLadders = true,
  showDripLoops = true,
  showBorewellLines = true,
  bgOpacity = 1.0,
  highContrastPipes = false,
  activeTool,
  onSelectTree,
  onSelectComponent,
  selectedComponentId,
  selectedTreeId,
  scale,
  setScale,
  position,
  setPosition,
  isPlaying = false,
  animDashOffset = 0,
  currentPhase = 'idle',
  pondVolumeLiters = 500,
  activeTreeCount = 0
}) => {
  const stageRef = useRef<Konva.Stage | null>(null);

  // Single Best Gemini Background Image (2752 x 1536 px)
  const [bgImage] = useImage('/farm_background.png');

  // Drawing pipeline state
  const [drawingPoints, setDrawingPoints] = useState<number[]>([]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.06;
    const stage = stageRef.current;
    if (!stage) return;
    
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.3, Math.min(10, newScale));
    setScale(clampedScale);
    
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  const getStageRelativePos = () => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    return {
      x: Math.round((pointer.x - stage.x()) / stage.scaleX()),
      y: Math.round((pointer.y - stage.y()) / stage.scaleY())
    };
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === stageRef.current || e.target.name() === 'farm-bg';
    const { x, y } = getStageRelativePos();

    if (activeTool === 'select') {
      if (clickedOnEmpty) {
        // Find nearest tree center for selection
        let nearest: Tree | null = null;
        let minDist = 20;
        farmData.trees.forEach(t => {
          const d = Math.hypot(t.position.pixel_x - x, t.position.pixel_y - y);
          if (d < minDist) {
            minDist = d;
            nearest = t;
          }
        });
        if (nearest) {
          onSelectTree(nearest);
          onSelectComponent(null);
        } else {
          onSelectTree(null);
          onSelectComponent(null);
        }
      }
      return;
    }

    // Pipeline laying (Main Pipe, Subline, Ladder)
    if (activeTool === 'main_pipe' || activeTool === 'subline' || activeTool === 'ladder') {
      const newPoints = [...drawingPoints, x, y];
      if (newPoints.length >= 4 && e.evt.detail === 2) {
        const defaultDia = activeTool === 'main_pipe' ? 90 : activeTool === 'subline' ? 50 : 32;
        const defaultLabel = activeTool === 'main_pipe' ? 'Main Pipeline (90mm)' : activeTool === 'subline' ? 'Subline Branch (50mm)' : 'Ladder Feeder Line (32mm)';
        
        const newPipe: PlacableComponent = {
          id: `PIPE-${Date.now()}`,
          type: activeTool,
          x: newPoints[0],
          y: newPoints[1],
          points: newPoints,
          diameter_mm: defaultDia,
          label: defaultLabel
        };
        onUpdateComponents([...customComponents, newPipe]);
        setDrawingPoints([]);
      } else {
        setDrawingPoints(newPoints);
      }
      return;
    }

    // Single click placement for components
    const id = `COMP-${Date.now()}`;
    let newComp: PlacableComponent | null = null;

    switch (activeTool) {
      case 'borewell':
        newComp = { id, type: 'borewell', x, y, label: 'Borewell Node' };
        break;
      case 'motor_7.5hp':
        newComp = { id, type: 'motor_7.5hp', x, y, hp: 7.5, status: 'on', label: '7.5 HP Motor' };
        break;
      case 'motor_10hp':
        newComp = { id, type: 'motor_10hp', x, y, hp: 10.0, status: 'on', label: '10 HP Motor' };
        break;
      case 'pond':
        newComp = { id, type: 'pond', x, y, width: 140, height: 90, label: 'Scalable Pond' };
        break;
      case 'fertigation_unit':
        newComp = { id, type: 'fertigation_unit', x, y, label: 'Fertigation Injector Unit' };
        break;
      case 'control_valve':
        newComp = { id, type: 'control_valve', x, y, valve_state: 'open', label: 'ON/OFF Control Valve' };
        break;
      case 't_valve':
        newComp = { id, type: 't_valve', x, y, label: 'T-Junction Valve' };
        break;
      case 'end_cap':
        newComp = { id, type: 'end_cap', x, y, is_end_capped: true, label: 'Pipe End-Cap Plug' };
        break;
      case 'tree':
        // Replicate a Red Dot at click location
        const newTree: Tree = {
          id: `TREE-${farmData.trees.length + 1}`,
          variety: 'Coconut Tree',
          planted_date: '2021-03-15',
          age_years: 5,
          position: { lat: 13.9858, lng: 78.4029, pixel_x: x, pixel_y: y },
          canopy_radius_m: 3.0,
          health_index: 0.95,
          grid_row: Math.round(y / 20.0),
          grid_col: Math.round(x / 20.0),
          notes: ['Manually placed red dot tree'],
          is_manual: true
        };
        farmData.trees.push(newTree);
        onSelectTree(newTree);
        break;
      case 'tree_drip_ring':
        // Snap drip turn loop directly around nearest red dot tree center
        let nearestTree: Tree | null = null;
        let minDist = 40;
        farmData.trees.forEach(t => {
          const d = Math.hypot(t.position.pixel_x - x, t.position.pixel_y - y);
          if (d < minDist) {
            minDist = d;
            nearestTree = t;
          }
        });
        if (nearestTree) {
          newComp = {
            id,
            type: 'tree_drip_ring',
            x: (nearestTree as Tree).position.pixel_x,
            y: (nearestTree as Tree).position.pixel_y,
            treeId: (nearestTree as Tree).id,
            label: `Drip Loop (${(nearestTree as Tree).id})`,
            dripper_count: 4,      // Default 4 microsprinklers/holes
            dripper_flow_lh: 8.0,  // Default 8 L/h per dripper
            diameter_mm: 16,        // Default 16mm loop pipe
            is_end_capped: true    // Closed at the end (does not loop back)
          };
        } else {
          newComp = {
            id,
            type: 'tree_drip_ring',
            x,
            y,
            label: 'Standalone Drip Loop',
            dripper_count: 4,
            dripper_flow_lh: 8.0,
            diameter_mm: 16,
            is_end_capped: true
          };
        }
        break;
    }

    if (newComp) {
      onUpdateComponents([...customComponents, newComp]);
      onSelectComponent(newComp);
    }
  };

  return (
    <Stage
      width={typeof window !== 'undefined' ? window.innerWidth : 1200}
      height={typeof window !== 'undefined' ? window.innerHeight : 800}
      onWheel={handleWheel}
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      draggable={activeTool === 'select'}
      onDragEnd={(e) => {
        if (e.target === stageRef.current) {
          setPosition({ x: e.target.x(), y: e.target.y() });
        }
      }}
      onClick={handleStageClick}
      ref={stageRef}
      style={{ cursor: activeTool === 'select' ? 'grab' : 'crosshair' }}
    >
      {/* 1. Primary Gemini Map Image Background (2752 x 1536 px) */}
      {bgImage && (
        <Layer listening={false}>
          <KonvaImage
            name="farm-bg"
            image={bgImage}
            width={2752}
            height={1536}
            opacity={bgOpacity}
          />
        </Layer>
      )}

      {/* 2. In-Progress Pipeline Drawing Preview */}
      {drawingPoints.length > 0 && (
        <Layer listening={false}>
          <Line
            points={drawingPoints}
            stroke={activeTool === 'main_pipe' ? '#ef4444' : activeTool === 'subline' ? '#3b82f6' : '#f59e0b'}
            strokeWidth={activeTool === 'main_pipe' ? 4.5 : activeTool === 'subline' ? 3 : 2}
            dash={[4, 4]}
          />
        </Layer>
      )}

      {/* 3. Custom Placed Components & Pipelines Layer */}
      <Layer>
        {customComponents.map((comp) => {
          const isSelected = selectedComponentId === comp.id;

          const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
            const newX = Math.round(e.target.x());
            const newY = Math.round(e.target.y());

            const updated = customComponents.map(c => {
              if (c.id === comp.id) {
                return { ...c, x: newX, y: newY };
              }
              // Synchronized parent-child drag: when dragging a borewell, move its paired motor!
              if (comp.type === 'borewell') {
                const isPairedMotor = (c.type === 'motor_7.5hp' || c.type === 'motor_10hp') &&
                                      (c.id.includes(comp.id.replace('BW-', '')) || Math.hypot(c.x - comp.x, c.y - comp.y) < 40);
                if (isPairedMotor) {
                  return { ...c, x: newX + 15, y: newY + 15 };
                }
              }
              return c;
            });
            onUpdateComponents(updated);
          };

          // Scalable & Rotatable Pond with Water Capacity & Live Fill Level Visualizer
          if (comp.type === 'pond') {
            const w = comp.width || 140;
            const h = comp.height || 90;
            const rot = comp.rotation || 0;
            const capacityLiters = comp.capacity_liters || 500000;
            const currentVol = pondVolumeLiters || 500;
            const fillRatio = Math.min(1.0, Math.max(0.02, currentVol / capacityLiters));
            const fillHeight = h * fillRatio;

            return (
              <Group
                key={comp.id}
                x={comp.x}
                y={comp.y}
                rotation={rot}
                offsetX={w / 2}
                offsetY={h / 2}
                draggable={activeTool === 'select'}
                onDragEnd={handleDragEnd}
                onClick={(e) => { e.cancelBubble = true; onSelectComponent(comp); }}
              >
                {/* Excavated Pond Bed */}
                <Rect
                  width={w}
                  height={h}
                  fill="#0284c7"
                  fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                  fillLinearGradientEndPoint={{ x: w, y: h }}
                  fillLinearGradientColorStops={[0, '#0c4a6e', 1, '#0284c7']}
                  stroke={isSelected ? '#f59e0b' : '#0ea5e9'}
                  strokeWidth={isSelected ? 3 : 2}
                  cornerRadius={8}
                />
                {/* Animated Rising Water Fill Level Layer */}
                <Rect
                  x={2}
                  y={h - fillHeight}
                  width={w - 4}
                  height={fillHeight - 2}
                  fill="rgba(6, 182, 212, 0.85)"
                  cornerRadius={6}
                />
                <Text
                  text={comp.label || 'Farm Storage Pond'}
                  x={10}
                  y={h / 2 - 16}
                  width={w - 20}
                  fill="white"
                  fontSize={11}
                  fontStyle="bold"
                />
                <Text
                  text={`💧 Live Level: ${Math.round(currentVol).toLocaleString()} / ${capacityLiters.toLocaleString()} L`}
                  x={10}
                  y={h / 2}
                  width={w - 20}
                  fill="#cff4fc"
                  fontSize={9}
                  fontStyle="bold"
                />
                <Text
                  text={`(${Math.round(fillRatio * 100)}% Capacity)`}
                  x={10}
                  y={h / 2 + 13}
                  width={w - 20}
                  fill="#7dd3fc"
                  fontSize={8}
                  fontStyle="bold"
                />
                {isSelected && (
                  <Text
                    text={`${Math.round(w)}m x ${Math.round(h)}m | ${rot}°`}
                    x={10}
                    y={h - 16}
                    fill="#fef08a"
                    fontSize={9}
                    fontStyle="bold"
                  />
                )}
              </Group>
            );
          }

          // Borewell
          if (comp.type === 'borewell') {
            return (
              <Group
                key={comp.id}
                x={comp.x}
                y={comp.y}
                draggable={activeTool === 'select'}
                onDragEnd={handleDragEnd}
                onClick={(e) => { e.cancelBubble = true; onSelectComponent(comp); }}
              >
                <Circle radius={12} fill="#64748b" stroke={isSelected ? '#f59e0b' : '#334155'} strokeWidth={2} />
                <Circle radius={4} fill="#0284c7" />
                <Text text={comp.label || 'Borewell'} x={15} y={-6} fill="#0f172a" fontSize={10} fontStyle="bold" />
              </Group>
            );
          }

          // Motors 7.5 HP & 10 HP (Surface Monoblock vs Submersible Pond Pump)
          if (comp.type === 'motor_7.5hp' || comp.type === 'motor_10hp') {
            const isSubmersible = comp.installation_type === 'submersible' || comp.id.includes('POND');
            const color = isSubmersible ? '#0284c7' : (comp.type === 'motor_10hp' ? '#dc2626' : '#ea580c');
            const icon = isSubmersible ? '🌊' : '⚙️';
            const label = isSubmersible ? '10HP Submersible (Pond)' : `${comp.hp || (comp.type === 'motor_10hp' ? 10 : 7.5)}HP Surface`;

            return (
              <Group
                key={comp.id}
                x={comp.x}
                y={comp.y}
                draggable={activeTool === 'select'}
                onDragEnd={handleDragEnd}
                onClick={(e) => { e.cancelBubble = true; onSelectComponent(comp); }}
              >
                <Rect width={26} height={20} x={-13} y={-10} fill={color} stroke={isSelected ? '#f59e0b' : '#0369a1'} strokeWidth={isSelected ? 2.5 : 1.5} cornerRadius={4} />
                <Text text={icon} x={-10} y={-7} fontSize={10} />
                <Text text="M" x={4} y={-5} fill="white" fontSize={10} fontStyle="bold" />
                <Text text={label} x={16} y={-5} fill={color} fontSize={9} fontStyle="bold" />
              </Group>
            );
          }

          // 7.5 HP Subline Booster Motor
          if (comp.type === 'subline_booster_motor') {
            return (
              <Group
                key={comp.id}
                x={comp.x}
                y={comp.y}
                draggable={activeTool === 'select'}
                onDragEnd={handleDragEnd}
                onClick={(e) => { e.cancelBubble = true; onSelectComponent(comp); }}
              >
                <Rect width={28} height={22} x={-14} y={-11} fill="#d97706" stroke={isSelected ? '#f59e0b' : '#78350f'} strokeWidth={isSelected ? 2.5 : 1.5} cornerRadius={4} />
                <Text text="🚀" x={-10} y={-7} fontSize={10} />
                <Text text="7.5HP Booster" x={16} y={-5} fill="#d97706" fontSize={10} fontStyle="bold" />
              </Group>
            );
          }

          // Fertigation Unit
          if (comp.type === 'fertigation_unit') {
            return (
              <Group
                key={comp.id}
                x={comp.x}
                y={comp.y}
                draggable={activeTool === 'select'}
                onDragEnd={handleDragEnd}
                onClick={(e) => { e.cancelBubble = true; onSelectComponent(comp); }}
              >
                <Rect width={22} height={22} x={-11} y={-11} fill="#8b5cf6" stroke={isSelected ? '#f59e0b' : '#5b21b6'} strokeWidth={isSelected ? 2.5 : 1.5} cornerRadius={3} />
                <Text text="F" x={-4} y={-6} fill="white" fontSize={12} fontStyle="bold" />
                <Text text="Fertigation" x={14} y={-5} fill="#6d28d9" fontSize={10} fontStyle="bold" />
              </Group>
            );
          }

          // ON/OFF Control Valve
          if (comp.type === 'control_valve') {
            const isOpen = comp.valve_state !== 'closed';
            return (
              <Group
                key={comp.id}
                x={comp.x}
                y={comp.y}
                draggable={activeTool === 'select'}
                onDragEnd={handleDragEnd}
                onClick={(e) => { e.cancelBubble = true; onSelectComponent(comp); }}
              >
                <Rect width={20} height={20} x={-10} y={-10} fill={isOpen ? '#10b981' : '#ef4444'} stroke={isSelected ? '#f59e0b' : '#1e293b'} strokeWidth={1.5} cornerRadius={4} />
                <Text text={isOpen ? 'ON' : 'OFF'} x={-8} y={-4} fill="white" fontSize={8} fontStyle="bold" />
                <Text text={comp.label || 'Control Valve'} x={14} y={-5} fill="#1e293b" fontSize={9} fontStyle="bold" />
              </Group>
            );
          }

          // T-Valve
          if (comp.type === 't_valve') {
            return (
              <Group
                key={comp.id}
                x={comp.x}
                y={comp.y}
                draggable={activeTool === 'select'}
                onDragEnd={handleDragEnd}
                onClick={(e) => { e.cancelBubble = true; onSelectComponent(comp); }}
              >
                <Circle radius={10} fill="#f59e0b" stroke={isSelected ? '#3b82f6' : '#78350f'} strokeWidth={1.5} />
                <Text text="T" x={-4} y={-6} fill="white" fontSize={11} fontStyle="bold" />
                <Text text={comp.label || 'T-Junction'} x={14} y={-5} fill="#78350f" fontSize={9} fontStyle="bold" />
              </Group>
            );
          }

          // End-Cap Plug
          if (comp.type === 'end_cap') {
            return (
              <Group
                key={comp.id}
                x={comp.x}
                y={comp.y}
                draggable={activeTool === 'select'}
                onDragEnd={handleDragEnd}
                onClick={(e) => { e.cancelBubble = true; onSelectComponent(comp); }}
              >
                <Rect width={10} height={16} x={-5} y={-8} fill="#dc2626" stroke="#ffffff" strokeWidth={1} cornerRadius={2} />
                <Line points={[-8, 0, 8, 0]} stroke="#dc2626" strokeWidth={3} />
                <Text text="End Cap" x={12} y={-5} fill="#dc2626" fontSize={8} fontStyle="bold" />
              </Group>
            );
          }

          // Drip Turn Loop Around Tree (Closed-end loop with customizable dripper holes)
          if (comp.type === 'tree_drip_ring') {
            if (!showDripLoops) return null;
            const dripperCount = comp.dripper_count || 4;
            const radius = 13;
            
            // Generate dripper hole positions around 360 degrees
            const dripperNodes = [];
            for (let i = 0; i < dripperCount; i++) {
              const angle = (i * 2 * Math.PI) / dripperCount;
              const dx = radius * Math.cos(angle);
              const dy = radius * Math.sin(angle);
              dripperNodes.push({ dx, dy });
            }

            return (
              <Group
                key={comp.id}
                x={comp.x}
                y={comp.y}
                draggable={activeTool === 'select'}
                onDragEnd={handleDragEnd}
                onClick={(e) => { e.cancelBubble = true; onSelectComponent(comp); }}
              >
                {/* Drip Loop Line */}
                <Ring innerRadius={11} outerRadius={14} fill="#0284c7" opacity={0.85} stroke={isSelected ? '#f59e0b' : '#0369a1'} strokeWidth={isSelected ? 2 : 1} />
                
                {/* End-Cap Plug on Loop (Closed at end) */}
                <Rect width={4} height={6} x={radius - 2} y={-3} fill="#dc2626" stroke="#ffffff" strokeWidth={0.5} />

                {/* Customizable Dripper / Microsprinkler Holes */}
                {dripperNodes.map((dNode, idx) => (
                  <Circle key={idx} radius={2.5} x={dNode.dx} y={dNode.dy} fill="#38bdf8" stroke="#0284c7" strokeWidth={0.5} />
                ))}

                <Text text={`${dripperCount} Drippers (${comp.diameter_mm || 16}mm)`} x={-28} y={-24} fill="#0284c7" fontSize={8} fontStyle="bold" />
              </Group>
            );
          }

          // Custom Polyline Pipeline (Main, Subline, Ladder)
          if ((comp.type === 'main_pipe' || comp.type === 'subline' || comp.type === 'ladder') && comp.points) {
            const isMain = comp.type === 'main_pipe';
            const isSub = comp.type === 'subline';
            
            if (isMain && !showMainlines) return null;
            if (isSub && !showSublines) return null;
            if (!isMain && !isSub && !showLadders) return null;

            const color = showHeatmap
              ? '#10b981'
              : (isMain ? '#ef4444' : isSub ? '#06b6d4' : '#f59e0b');
            
            const width = isMain ? 4.5 : isSub ? 3 : 2.0;

            return (
              <Group key={comp.id}>
                {/* High Contrast Dark Stroke Backing for Maximum Pipe Visibility */}
                {highContrastPipes && (
                  <Line
                    points={comp.points}
                    stroke="#0f172a"
                    strokeWidth={width + 3.5}
                    listening={false}
                  />
                )}
                <Line
                  points={comp.points}
                  stroke={isSelected ? '#f59e0b' : color}
                  strokeWidth={highContrastPipes ? width + 1.0 : width}
                  dash={isPlaying ? [12, 6] : undefined}
                  dashOffset={isPlaying ? -animDashOffset : 0}
                  hitStrokeWidth={14}
                  onClick={(e) => { e.cancelBubble = true; onSelectComponent(comp); }}
                />

                {/* End Cap Marker if closed */}
                {comp.is_end_capped && comp.points.length >= 4 && (
                  <Circle
                    x={comp.points[comp.points.length - 2]}
                    y={comp.points[comp.points.length - 1]}
                    radius={5}
                    fill="#dc2626"
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                )}
              </Group>
            );
          }

          return null;
        })}

        {/* Dynamic Closed-Loop System Topology Lines: Borewell -> Pond & Pond -> Fertigation Unit */}
        {(() => {
          if (!showBorewellLines) return null;
          const borewells = customComponents.filter(c => c.type === 'borewell');
          const pond = customComponents.find(c => c.type === 'pond');
          const motor = customComponents.find(c => c.type === 'motor_7.5hp' || c.type === 'motor_10hp');
          const fert = customComponents.find(c => c.type === 'fertigation_unit');

          return (
            <>
              {/* 1. Borewell -> Pond Filling Line */}
              {pond && borewells.map(b => (
                <Group key={`fill-${b.id}`}>
                  <Line
                    points={[b.x, b.y, pond.x, pond.y]}
                    stroke="#06b6d4"
                    strokeWidth={3.5}
                    dash={[10, 5]}
                    dashOffset={isPlaying ? -animDashOffset * 1.5 : 0}
                  />
                  <Text text="🕳️ Borewell Fill Line" x={(b.x + pond.x)/2} y={(b.y + pond.y)/2 - 10} fill="#0891b2" fontSize={8} fontStyle="bold" />
                </Group>
              ))}

              {/* 2. Pond -> Motor -> Fertigation Dosing Unit Suction Line */}
              {pond && fert && (
                <Group>
                  <Line
                    points={[pond.x, pond.y, motor ? motor.x : (pond.x + fert.x)/2, motor ? motor.y : (pond.y + fert.y)/2, fert.x, fert.y]}
                    stroke="#8b5cf6"
                    strokeWidth={4}
                    dash={[10, 5]}
                    dashOffset={isPlaying ? -animDashOffset * 1.8 : 0}
                  />
                  <Text text="🧪 Fertigation Suction Line" x={(pond.x + fert.x)/2} y={(pond.y + fert.y)/2 - 12} fill="#7c3aed" fontSize={8} fontStyle="bold" />
                </Group>
              )}
            </>
          );
        })()}
      </Layer>

      {/* 4. Tree Hit-Targets, Labels & Red Dots Layer */}
      <Layer>
        {farmData.trees.map((tree: Tree, index: number) => {
          const x = tree.position.pixel_x;
          const y = tree.position.pixel_y;
          const isSelected = selectedTreeId === tree.id;
          const isManual = Boolean((tree as Tree & { is_manual?: boolean }).is_manual);
          const isHydrated = isPlaying && index < activeTreeCount;
          const pressureColor = isHydrated ? '#10b981' : simulationResult?.heatmap?.trees[tree.id];
          const treeLabel = tree.id.replace('TREE-', 'T-');
          const showLabels = scale >= 0.7 || isSelected;

          return (
            <Group
              key={`${tree.id}-${index}`}
              x={x}
              y={y}
              onClick={(e) => { e.cancelBubble = true; onSelectTree(tree); }}
              onTap={(e) => { e.cancelBubble = true; onSelectTree(tree); }}
            >
              {/* Active Real-Time Water Spray Ring when tree is reached by wave propagation */}
              {isHydrated && (
                <Circle
                  radius={17}
                  fill="rgba(56, 189, 248, 0.22)"
                  stroke="#38bdf8"
                  strokeWidth={1.2}
                  dash={[4, 3]}
                  dashOffset={-animDashOffset * 1.2}
                />
              )}

              {/* Closed-End Tree Drip Loop & Fertigation Microsprinklers around Tree Red Dot */}
              {(scale >= 0.55 || isSelected) && showDripLoops && (
                <Group>
                  {/* Drip Loop Pipe around Red Dot */}
                  <Circle
                    radius={13}
                    stroke={isSelected ? '#f59e0b' : isHydrated ? '#10b981' : '#0284c7'}
                    strokeWidth={1.5}
                    dash={[6, 2]}
                  />
                  {/* Dynamic Microsprinkler Dripper Holes along Loop Perimeter */}
                  {(() => {
                    const count = tree.dripper_count || 4;
                    const holes = [];
                    for (let i = 0; i < count; i++) {
                      const angleDeg = (i * 360) / count;
                      const rad = (angleDeg * Math.PI) / 180;
                      const hx = Math.cos(rad) * 13;
                      const hy = Math.sin(rad) * 13;
                      holes.push(
                        <Circle
                          key={i}
                          x={hx}
                          y={hy}
                          radius={isHydrated ? 2.8 : 2.2}
                          fill={isHydrated ? '#34d399' : '#38bdf8'}
                          stroke="#ffffff"
                          strokeWidth={0.8}
                        />
                      );
                    }
                    return holes;
                  })()}
                </Group>
              )}

              {/* Tree ID Label layered right above the red dot pixel */}
              {showLabels && (
                <Group y={-14}>
                  <Rect
                    x={-19}
                    y={-7}
                    width={38}
                    height={11}
                    fill={isSelected ? '#f59e0b' : 'rgba(15, 23, 42, 0.88)'}
                    cornerRadius={3}
                  />
                  <Text
                    text={treeLabel}
                    x={-19}
                    y={-6}
                    width={38}
                    align="center"
                    fontSize={7}
                    fontStyle="bold"
                    fill={isSelected ? '#0f172a' : '#ffffff'}
                  />
                </Group>
              )}

              {/* Render explicit red dot for manually added trees or when selected/heatmap active */}
              {(isManual || isSelected || (showHeatmap && pressureColor)) ? (
                <>
                  <Circle radius={4.5} fill={showHeatmap && pressureColor ? pressureColor : '#dc2626'} stroke="#ffffff" strokeWidth={1} />
                  <Circle radius={9} fill="rgba(220, 38, 38, 0.25)" />
                  {isSelected && (
                    <Circle radius={12} stroke="#f59e0b" strokeWidth={2} dash={[4, 2]} />
                  )}
                </>
              ) : (
                /* Invisible click target over the red dot on the background image */
                <Circle
                  radius={8}
                  fill="transparent"
                />
              )}
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
};

export default FarmCanvas;
