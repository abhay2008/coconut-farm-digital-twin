"use client";

import React from 'react';
import { Tree, PlacableComponent } from '../../types/farm';

interface InspectorProps {
  tree: Tree | null;
  component: PlacableComponent | null;
  onClose: () => void;
  onDeleteTree?: (id: string) => void;
  onDeleteComponent?: (id: string) => void;
  onUpdateTree?: (updated: Tree) => void;
  onUpdateComponent?: (updated: PlacableComponent) => void;
  pressure?: number;
  flowLph?: number;
}

const TreeInspector: React.FC<InspectorProps> = ({
  tree,
  component,
  onClose,
  onDeleteTree,
  onDeleteComponent,
  onUpdateTree,
  onUpdateComponent,
  pressure,
  flowLph
}) => {
  if (!tree && !component) return null;

  return (
    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md p-5 rounded-xl shadow-2xl border border-gray-200 z-20 w-84 max-h-[90vh] overflow-y-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
          {tree ? '🌴 Coconut Tree Details' : '🛠️ Infrastructure Component'}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 font-bold text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Tree Details */}
      {tree && (
        <div className="space-y-3 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Tree ID</span>
              <span className="font-bold text-sm text-emerald-900">{tree.id}</span>
            </div>
            <span className="bg-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
              {tree.variety}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 p-2.5 rounded border">
              <span className="text-gray-400 block text-[10px]">Age</span>
              <span className="font-semibold text-gray-800">{tree.age_years || 5} Years</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded border">
              <span className="text-gray-400 block text-[10px]">Health Index</span>
              <span className="font-semibold text-gray-800">{Math.round(tree.health_index * 100)}%</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded border">
              <span className="text-gray-400 block text-[10px]">Grid Row / Col</span>
              <span className="font-semibold text-gray-800">R{tree.grid_row} : C{tree.grid_col}</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded border">
              <span className="text-gray-400 block text-[10px]">Canopy Radius</span>
              <span className="font-semibold text-gray-800">{tree.canopy_radius_m} meters</span>
            </div>
          </div>

          {/* Drip Irrigation Hydraulic Output */}
          <div className="bg-slate-50 p-3 rounded border space-y-2">
            <span className="font-bold text-gray-700 block uppercase tracking-wider text-[10px]">
              💧 Hydraulic Delivery Status
            </span>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Tree Spacing:</span>
              <span className="font-semibold text-slate-700">20.0 ft (6.10 meters)</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Drip Pressure:</span>
              <span className={`font-bold px-2 py-0.5 rounded text-white ${
                pressure !== undefined
                  ? (pressure >= 1.0 ? 'bg-emerald-600' : 'bg-amber-600')
                  : 'bg-gray-400'
              }`}>
                {pressure !== undefined ? `${pressure.toFixed(2)} bar` : 'Not Simulated'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600">Tree Delivery Rate:</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {flowLph !== undefined ? `${flowLph.toFixed(1)} L/hr` : '32.0 L/hr'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1 border-t">
              <span className="text-gray-600">Volume per 2-hr Run:</span>
              <span className="font-bold text-emerald-800">
                {flowLph !== undefined ? `${(flowLph * 2).toFixed(1)} Liters` : '64.0 Liters'}
              </span>
            </div>
          </div>

          {/* Per-Tree Dripper / Hole Customization */}
          <div className="bg-sky-50 border border-sky-200 p-3 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-bold text-sky-900 uppercase tracking-wider text-[10px]">
                🔄 Per-Tree Microsprinkler Holes
              </label>
              <span className="font-bold text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-300">
                {tree.dripper_count || 4} Holes
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="16"
              step="1"
              value={tree.dripper_count || 4}
              onChange={(e) => {
                if (onUpdateTree) {
                  onUpdateTree({ ...tree, dripper_count: parseInt(e.target.value) || 4 });
                }
              }}
              className="w-full h-1.5 bg-sky-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
            <div className="flex justify-between text-[9.5px] text-sky-700 font-semibold">
              <span>Nominal Flow: {(tree.dripper_count || 4) * 8} L/hr</span>
              <span>Actual: {flowLph !== undefined ? `${flowLph.toFixed(1)} L/hr` : '32.0 L/hr'}</span>
            </div>
          </div>

          <div className="bg-gray-50 p-2.5 rounded border text-[11px] space-y-1 text-gray-600 font-mono">
            <div>Pixel Position X: {Math.round(tree.position.pixel_x)} | Y: {Math.round(tree.position.pixel_y)}</div>
          </div>

          {onDeleteTree && (
            <button
              onClick={() => onDeleteTree(tree.id)}
              className="w-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-300 py-2 rounded font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>🗑️</span> Delete Coconut Tree
            </button>
          )}
        </div>
      )}

      {/* Custom Component Details */}
      {component && (
        <div className="space-y-3 text-xs">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Component ID</span>
              <span className="font-bold text-sm text-blue-900">{component.id}</span>
            </div>
            <div className="text-right">
              <span className="bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase block">
                {component.type.replace('_', ' ')}
              </span>
              <span className="text-[9px] font-extrabold text-cyan-800 block mt-0.5">
                {component.installation_type === 'submersible' || component.id.includes('POND') ? '🌊 SUBMERSIBLE (POND)' : '⚙️ SURFACE MONOBLOCK'}
              </span>
            </div>
          </div>

          {/* Component Label */}
          <div className="space-y-1.5">
            <label className="block text-gray-700 font-semibold">Label / Name</label>
            <input
              type="text"
              value={component.label || ''}
              onChange={(e) => {
                if (onUpdateComponent) {
                  onUpdateComponent({ ...component, label: e.target.value });
                }
              }}
              className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 font-medium text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Drip Turn Loop Configuration (Customizable Microsprinklers / Holes) */}
          {component.type === 'tree_drip_ring' && (
            <div className="bg-sky-50 border border-sky-200 p-3 rounded-lg space-y-3">
              <label className="font-bold text-sky-900 block uppercase tracking-wider text-[10px]">
                🔄 Drip Loop & Emitter Configuration
              </label>

              {/* Number of Dripper Holes */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-gray-700 font-semibold">Microsprinkler / Dripper Holes</label>
                  <span className="font-bold text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-300">
                    {component.dripper_count || 4} Holes
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="16"
                  step="1"
                  value={component.dripper_count || 4}
                  onChange={(e) => {
                    if (onUpdateComponent) {
                      onUpdateComponent({ ...component, dripper_count: parseInt(e.target.value) || 4 });
                    }
                  }}
                  className="w-full h-1.5 bg-sky-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
              </div>

              {/* Flow rating per dripper hole */}
              <div className="space-y-1">
                <label className="block text-gray-700 font-medium">Flow Rating per Hole (L/h)</label>
                <input
                  type="number"
                  step="0.5"
                  value={component.dripper_flow_lh || 8.0}
                  onChange={(e) => {
                    if (onUpdateComponent) {
                      onUpdateComponent({ ...component, dripper_flow_lh: parseFloat(e.target.value) || 8.0 });
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 font-semibold"
                />
              </div>

              {/* Pipe Diameter */}
              <div className="space-y-1">
                <label className="block text-gray-700 font-medium">Loop Pipe Diameter (mm)</label>
                <input
                  type="number"
                  value={component.diameter_mm || 16}
                  onChange={(e) => {
                    if (onUpdateComponent) {
                      onUpdateComponent({ ...component, diameter_mm: parseFloat(e.target.value) || 16 });
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 font-semibold"
                />
              </div>

              {/* Total Delivery Rate Calculation */}
              <div className="bg-white p-2 rounded border text-xs flex justify-between items-center font-semibold">
                <span className="text-gray-600">Calculated Loop Delivery:</span>
                <span className="text-emerald-700 font-bold">
                  {((component.dripper_count || 4) * (component.dripper_flow_lh || 8.0)).toFixed(1)} L/hr
                </span>
              </div>
            </div>
          )}

          {/* Pipelines: Main, Subline, Ladder */}
          {(component.type === 'main_pipe' || component.type === 'subline' || component.type === 'ladder') && (
            <div className="bg-slate-50 p-3 rounded-lg border space-y-3">
              <label className="font-bold text-gray-800 block uppercase tracking-wider text-[10px]">
                📏 Pipeline Specifications
              </label>

              <div className="space-y-1">
                <label className="block text-gray-700 font-semibold">Inner Pipe Diameter (mm)</label>
                <input
                  type="number"
                  value={component.diameter_mm || (component.type === 'main_pipe' ? 90 : component.type === 'subline' ? 50 : 32)}
                  onChange={(e) => {
                    if (onUpdateComponent) {
                      onUpdateComponent({ ...component, diameter_mm: parseFloat(e.target.value) || 32 });
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 font-bold text-gray-900"
                />
              </div>

              {/* End Cap Closure Toggle */}
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-gray-700 font-medium">Cap Off / Close Line End</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateComponent) {
                      onUpdateComponent({ ...component, is_end_capped: !component.is_end_capped });
                    }
                  }}
                  className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                    component.is_end_capped
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {component.is_end_capped ? '🛑 End Capped' : 'Open End'}
                </button>
              </div>
            </div>
          )}

          {/* Control Valve (ON/OFF) */}
          {component.type === 'control_valve' && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg space-y-2">
              <label className="font-bold text-emerald-900 block uppercase tracking-wider text-[10px]">
                🚰 Plumbing Valve Status
              </label>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-semibold">Valve Position</span>
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateComponent) {
                      const nextState = component.valve_state === 'closed' ? 'open' : 'closed';
                      onUpdateComponent({ ...component, valve_state: nextState });
                    }
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    component.valve_state !== 'closed'
                      ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-300'
                      : 'bg-red-600 text-white shadow ring-2 ring-red-300'
                  }`}
                >
                  {component.valve_state !== 'closed' ? '🟢 Valve OPEN (ON)' : '🔴 Valve CLOSED (OFF)'}
                </button>
              </div>
            </div>
          )}

          {/* Scalable Pond Configuration */}
          {component.type === 'pond' && (
            <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-lg space-y-3">
              <label className="font-bold text-cyan-900 block uppercase tracking-wider text-[10px]">
                💧 Farm Storage Pond Configuration
              </label>

              {/* Water Capacity in Liters */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-gray-700 font-semibold">Storage Capacity (Liters)</label>
                  <span className="font-bold text-cyan-800 bg-white px-2 py-0.5 rounded border border-cyan-300">
                    {((component.capacity_liters || 500000) / 1000).toLocaleString()} m³
                  </span>
                </div>
                <input
                  type="number"
                  step="10000"
                  value={component.capacity_liters || 500000}
                  onChange={(e) => {
                    if (onUpdateComponent) {
                      onUpdateComponent({ ...component, capacity_liters: parseFloat(e.target.value) || 100000 });
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 font-bold text-cyan-950 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  placeholder="Enter capacity in Liters (e.g. 500000)"
                />
              </div>

              {/* Rotation Angle in Degrees */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-gray-700 font-semibold">Rotation Angle (Degrees)</label>
                  <span className="font-bold text-cyan-900 bg-white px-2 py-0.5 rounded border border-cyan-300">
                    {component.rotation || 0}°
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={component.rotation || 0}
                  onChange={(e) => {
                    if (onUpdateComponent) {
                      onUpdateComponent({ ...component, rotation: parseInt(e.target.value) || 0 });
                    }
                  }}
                  className="w-full h-1.5 bg-cyan-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                />
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={component.rotation || 0}
                  onChange={(e) => {
                    if (onUpdateComponent) {
                      onUpdateComponent({ ...component, rotation: parseInt(e.target.value) || 0 });
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 font-semibold text-center mt-1"
                />
              </div>

              {/* Pond Dimensions */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-cyan-200">
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Width (m)</label>
                  <input
                    type="number"
                    value={component.width || 140}
                    onChange={(e) => {
                      if (onUpdateComponent) {
                        onUpdateComponent({ ...component, width: parseFloat(e.target.value) || 50 });
                      }
                    }}
                    className="w-full bg-white border rounded px-2 py-1 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-medium mb-1">Height (m)</label>
                  <input
                    type="number"
                    value={component.height || 90}
                    onChange={(e) => {
                      if (onUpdateComponent) {
                        onUpdateComponent({ ...component, height: parseFloat(e.target.value) || 50 });
                      }
                    }}
                    className="w-full bg-white border rounded px-2 py-1 font-semibold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Fertigation Unit Configuration */}
          {component.type === 'fertigation_unit' && (
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg space-y-3">
              <label className="font-bold text-purple-900 block uppercase tracking-wider text-[10px]">
                🧪 Fertigation Dosing Pump Specifications
              </label>

              <div className="space-y-1">
                <label className="block text-gray-700 font-semibold">Active Nutrient Mix</label>
                <select
                  value={component.nutrient_mix || "N-P-K 19-19-19"}
                  onChange={(e) => {
                    if (onUpdateComponent) {
                      onUpdateComponent({ ...component, nutrient_mix: e.target.value });
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 font-bold text-purple-950 text-xs"
                >
                  <option value="N-P-K 19-19-19">N-P-K 19-19-19 (General Growth)</option>
                  <option value="Calcium Nitrate + Boron">Calcium Nitrate + Boron (Fruit Setting)</option>
                  <option value="Potassium Sulphate (SOP)">Potassium Sulphate (Nut Weight & Yield)</option>
                  <option value="Micronutrient Mix (Fe, Zn, Mn, Cu)">Micronutrient Mix (Fe, Zn, Mn, Cu)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-gray-700 font-semibold">Dosing Injection Rate (L/hr)</label>
                <input
                  type="number"
                  value={component.injection_rate_lph || 50}
                  onChange={(e) => {
                    if (onUpdateComponent) {
                      onUpdateComponent({ ...component, injection_rate_lph: parseFloat(e.target.value) || 10 });
                    }
                  }}
                  className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 font-bold text-purple-950 text-xs"
                />
              </div>
            </div>
          )}

          {/* Motors */}
          {(component.type === 'motor_7.5hp' || component.type === 'motor_10hp') && (
            <div className="space-y-2">
              <label className="block text-gray-600 font-medium">Motor Rating (HP)</label>
              <input
                type="number"
                value={component.hp || 7.5}
                onChange={(e) => {
                  if (onUpdateComponent) {
                    onUpdateComponent({ ...component, hp: parseFloat(e.target.value) || 5 });
                  }
                }}
                className="w-full bg-white border rounded px-2 py-1 font-semibold"
              />
            </div>
          )}

          <div className="bg-gray-50 p-2.5 rounded border text-[11px] space-y-1 text-gray-600 font-mono">
            <div>Position X: {Math.round(component.x)} | Y: {Math.round(component.y)}</div>
          </div>

          {onDeleteComponent && (
            <button
              onClick={() => onDeleteComponent(component.id)}
              className="w-full bg-red-50 text-red-700 hover:bg-red-100 border border-red-300 py-2 rounded font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <span>🗑️</span> Delete Component
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TreeInspector;
