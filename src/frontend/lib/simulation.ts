import { FarmData, PlacableComponent } from '../types/farm';

export interface SimulationResult {
  treePressures: Record<string, number>;
  treeFlowLph: Record<string, number>; // Liters per hour delivered per tree
  underPressureTrees: string[];        // tree IDs with pressure < 1.0 bar
  totalFarmFlowLph: number;           // Total farm flow rate in Liters/Hour
  totalFarmM3PerHour: number;         // Total farm flow in m^3/Hour
  avgTreeFlowLph: number;             // Average flow rate per tree
  uniformityIndexPercent: number;     // Irrigation pressure & flow uniformity %
  heatmap: {
    trees: Record<string, string>;    // tree ID -> color
    pipes: Record<string, string>;    // component ID -> color
  };
}

// Color mapping based on pressure (bar)
function getHeatmapColor(pressure: number): string {
  if (pressure < 0.5) return '#ef4444'; // Red: Critical low pressure (<0.5 bar)
  if (pressure < 1.0) return '#f59e0b'; // Amber: Sub-optimal (0.5 - 1.0 bar)
  if (pressure < 2.0) return '#10b981'; // Green: Optimal pressure (1.0 - 2.0 bar)
  return '#3b82f6';                     // Blue: High pressure (>= 2.0 bar)
}

export interface ClosedLoopSimulationResult extends SimulationResult {
  pondWaterLevelLiters: number;
  pondFillLevelPercent: number;
  pondInflowLph: number;           // Borewell -> Pond filling rate
  pondDrawdownLph: number;         // Pond -> Extraction Motor drawdown rate
  pondTimeToFillHours: number;     // Time to fill pond
  fertigationInjectionLph: number; // Fertigation pump injection rate
  fertigationPpm: number;          // Nutrient concentration in ppm
  nutrientGramsPerHourPerTree: number; // Nutrient dosage per tree (g/hr)
  
  // Real-World 9-Hour Power Window & 150L/Tree Engineering Results
  targetLitersPerTreePerDay: number;   // 150 L/tree/day
  dailyFarmWaterRequiredLiters: number;// Total farm daily requirement (e.g. 164,850 L)
  powerWindowHoursAvailable: number;   // 9.0 Hours 3-phase power window
  irrigationTimeRequiredHours: number; // Hours needed to deliver 150L/tree (e.g. 4.69 hrs)
  powerBufferRemainingHours: number;  // Surplus buffer within 9-hr window (e.g. 4.31 hrs)
  borewellMotorAssignments: Array<{ id: string; hp: number; isFurthest: boolean; rateLph: number }>;
  sublineBoosterStatus: { active: boolean; hp: number; pressureBoostBar: number };
  sustainableStatus: "OPTIMAL" | "FEASIBLE" | "DEFICIT";

  // Equipment Classification & 2-Phase 9-Hour Schedule
  equipmentClassification: {
    submersiblePondPump: string;
    surfaceBorewellMotors: string;
    sublineBooster: string;
  };
  schedule: Array<{ stage: string; durationHours: number; flowRateLpm: number; description: string }>;
  zones: Array<{ id: string; name: string; treeCount: number; flowLpm: number; sublineMm: number }>;
}

export function runHydraulicSimulation(farmData: FarmData, customComponents?: PlacableComponent[]): ClosedLoopSimulationResult {
  const result: ClosedLoopSimulationResult = {
    treePressures: {},
    treeFlowLph: {},
    underPressureTrees: [],
    totalFarmFlowLph: 0,
    totalFarmM3PerHour: 0,
    avgTreeFlowLph: 0,
    uniformityIndexPercent: 100,
    heatmap: { trees: {}, pipes: {} },
    pondWaterLevelLiters: 450000,
    pondFillLevelPercent: 90,
    pondInflowLph: 69000,
    pondDrawdownLph: 35168,
    pondTimeToFillHours: 2.39,
    fertigationInjectionLph: 50,
    fertigationPpm: 1400,
    nutrientGramsPerHourPerTree: 45,
    targetLitersPerTreePerDay: 150,
    dailyFarmWaterRequiredLiters: 164850,
    powerWindowHoursAvailable: 9.0,
    irrigationTimeRequiredHours: 4.69,
    powerBufferRemainingHours: 4.31,
    borewellMotorAssignments: [],
    sublineBoosterStatus: { active: true, hp: 7.5, pressureBoostBar: 1.5 },
    sustainableStatus: "OPTIMAL",
    equipmentClassification: {
      submersiblePondPump: "🌊 10 HP Submersible Pump (Submerged inside Storage Pond)",
      surfaceBorewellMotors: "⚙️ 7x Surface Monoblock Pumps (7x 7.5HP at Wellhead Pits)",
      sublineBooster: "🚀 1x 7.5 HP Surface Inline Booster Pump (+1.5 bar Boost)"
    },
    schedule: [
      { stage: "Stage A: Borewell Pond Fill", durationHours: 5.5, flowRateLpm: 500.0, description: "7 Surface Borewell Pumps fill Pond in parallel" },
      { stage: "Changeover", durationHours: 0.25, flowRateLpm: 0.0, description: "Borewells off; 10HP Submersible Pond Pump started; valves set" },
      { stage: "Stage B/C/D: Fertigation & Distribution", durationHours: 3.25, flowRateLpm: 845.4, description: "10HP Submersible Pond Pump delivers fertigated water to 3 zones" }
    ],
    zones: [
      { id: "Zone A", name: "Main Block", treeCount: 456, flowLpm: 350.7, sublineMm: 75 },
      { id: "Zone B", name: "Lower-Left Block", treeCount: 319, flowLpm: 245.4, sublineMm: 63 },
      { id: "Zone C", name: "Right Block", treeCount: 324, flowLpm: 249.2, sublineMm: 63 }
    ]
  };

  const comps: PlacableComponent[] = customComponents || farmData.customComponents || [];

  // 1. Spatially Optimize the 7 Borewells and Assign Motors (2x 10HP + 5x 7.5HP)
  const borewells = comps.filter(c => c.type === 'borewell');
  const pond = comps.find(c => c.type === 'pond') || { x: 250, y: 250, capacity_liters: 500000, current_water_liters: 450000 };
  const fertUnit = comps.find(c => c.type === 'fertigation_unit');

  // Calculate distance from each borewell to the central storage pond
  const borewellsWithDist = borewells.map(b => ({
    ...b,
    distToPond: Math.hypot(b.x - pond.x, b.y - pond.y)
  })).sort((a, b) => b.distToPond - a.distToPond); // Furthest borewells first

  // Assign 2x 10 HP motors to the 2 furthest/highest-head borewells, 5x 7.5 HP to the remaining
  let totalBorewellInflowLph = 0;
  const motorAssignments: Array<{ id: string; hp: number; isFurthest: boolean; rateLph: number }> = [];

  borewellsWithDist.forEach((b, index) => {
    const isFurthest10Hp = index < 2; // Top 2 furthest borewells get 10 HP motors
    const hp = isFurthest10Hp ? 10 : 7.5;
    const dischargeLph = isFurthest10Hp ? 12000 : 9000; // 12,000 L/hr for 10HP, 9,000 L/hr for 7.5HP
    totalBorewellInflowLph += dischargeLph;

    motorAssignments.push({
      id: b.id,
      hp,
      isFurthest: isFurthest10Hp,
      rateLph: dischargeLph
    });
  });

  // Default to 69,000 L/hr if 7 borewells aren't fully placed yet
  const pondInflowLph = borewells.length > 0 ? totalBorewellInflowLph : 69000;

  const pondCapacityLiters = pond?.capacity_liters || 500000;
  const currentPondLiters = pond?.current_water_liters || 450000;

  result.pondInflowLph = pondInflowLph;
  result.pondWaterLevelLiters = currentPondLiters;
  result.pondFillLevelPercent = Math.min(100, Math.round((currentPondLiters / pondCapacityLiters) * 100));
  result.borewellMotorAssignments = motorAssignments;

  if (pondCapacityLiters > currentPondLiters && pondInflowLph > 0) {
    result.pondTimeToFillHours = Math.round(((pondCapacityLiters - currentPondLiters) / pondInflowLph) * 100) / 100;
  } else {
    result.pondTimeToFillHours = 0;
  }

  // 2. Subline 7.5 HP Inline Booster Motor Check
  const sublineBooster = comps.find(c => c.type === 'subline_booster_motor' || (c.type === 'motor_7.5hp' && Boolean(c.is_booster)));
  result.sublineBoosterStatus = {
    active: true,
    hp: 7.5,
    pressureBoostBar: sublineBooster ? 1.5 : 0.8
  };

  // Base Source Suction Pressure from Pond Motor (10 HP or 7.5 HP Extraction Motor)
  const sourcePressureBar = 3.8 + (sublineBooster ? 1.5 : 0.8);

  // 3. Identify Drip Turn Loops & Emitter Settings per Tree
  const treeLoopSettings: Record<string, { drippers: number; flowRating: number; dia: number }> = {};
  comps.forEach((c: PlacableComponent) => {
    if (c.type === 'tree_drip_ring' && c.treeId) {
      treeLoopSettings[c.treeId] = {
        drippers: c.dripper_count || 4,
        flowRating: c.dripper_flow_lh || 8.0,
        dia: c.diameter_mm || 16
      };
    }
  });

  // 4. Find closed ON/OFF valves
  const closedValves = new Set<string>();
  comps.forEach((c: PlacableComponent) => {
    if (c.type === 'control_valve' && c.valve_state === 'closed') {
      closedValves.add(c.id);
    }
  });

  // 5. Calculate Distance & Pressure for each tree with Booster Pump Effect
  const sourceX = fertUnit?.x || pond?.x || 200;
  const sourceY = fertUnit?.y || pond?.y || 200;

  // Pipeline friction factors based on Hazen-Williams
  const mainPipes = comps.filter((c: PlacableComponent) => c.type === 'main_pipe');
  const sublines = comps.filter((c: PlacableComponent) => c.type === 'subline');
  const ladders = comps.filter((c: PlacableComponent) => c.type === 'ladder');

  const mainDia = mainPipes[0]?.diameter_mm || 110;
  const subDia = sublines[0]?.diameter_mm || 75;
  const ladderDia = ladders[0]?.diameter_mm || 40;

  let totalFarmFlowLph = 0;
  let totalPressureSum = 0;

  farmData.trees.forEach(tree => {
    const tx = tree.position.pixel_x;
    const ty = tree.position.pixel_y;
    const distToSourceMeters = Math.hypot(tx - sourceX, ty - sourceY) * 0.15; // 0.15m per pixel scale

    // Friction loss per meter based on Hazen-Williams
    const frictionLossPerM = (mainDia >= 110 ? 0.0002 : 0.0005) + (subDia >= 75 ? 0.0003 : 0.0008) + (ladderDia >= 40 ? 0.0008 : 0.002);
    let pressure = Math.max(0.4, sourcePressureBar - distToSourceMeters * frictionLossPerM);

    // If any closed valve is in vicinity, pressure drops
    if (closedValves.size > 0) {
      pressure = pressure * 0.1;
    }

    // Dripper holes configuration (Per-tree customization or default 4 holes per tree loop, 8 L/h rating)
    const settings = treeLoopSettings[tree.id] || { drippers: 4, flowRating: 8.0, dia: 16 };
    const drippersCount = tree.dripper_count || settings.drippers || 4;
    const nominalFlowPerHole = settings.flowRating;

    // Actual flow per hole = Q_nom * sqrt(P / 1.0 bar)
    const actualFlowPerHole = nominalFlowPerHole * Math.sqrt(Math.max(0.1, pressure / 1.0));
    const treeTotalFlowLph = drippersCount * actualFlowPerHole;

    result.treePressures[tree.id] = pressure;
    result.treeFlowLph[tree.id] = treeTotalFlowLph;
    result.heatmap.trees[tree.id] = getHeatmapColor(pressure);

    if (pressure < 1.0) {
      result.underPressureTrees.push(tree.id);
    }

    totalFarmFlowLph += treeTotalFlowLph;
    totalPressureSum += pressure;
  });

  // 6. Calculate Farm Totals & 9-Hour 150L/Tree Engineering Balance
  const treeCount = farmData.trees.length || 1;
  result.totalFarmFlowLph = Math.round(totalFarmFlowLph);
  result.totalFarmM3PerHour = Math.round((totalFarmFlowLph / 1000) * 100) / 100;
  result.avgTreeFlowLph = Math.round((totalFarmFlowLph / treeCount) * 10) / 10;
  result.pondDrawdownLph = result.totalFarmFlowLph;

  // 150 Liters per tree per day target
  const targetLiters = 150;
  const totalDailyWaterReq = treeCount * targetLiters; // e.g. 1,099 * 150 = 164,850 Liters
  result.targetLitersPerTreePerDay = targetLiters;
  result.dailyFarmWaterRequiredLiters = totalDailyWaterReq;

  // Hours required to deliver 150 L/tree at avgTreeFlowLph
  const avgFlow = result.avgTreeFlowLph > 0 ? result.avgTreeFlowLph : 32.0;
  const hoursRequired = Math.round((targetLiters / avgFlow) * 100) / 100; // e.g. 150 / 32 = 4.69 Hours
  result.irrigationTimeRequiredHours = hoursRequired;

  // Remaining buffer within 9-Hour 3-phase power window
  const powerWindow = 9.0;
  result.powerWindowHoursAvailable = powerWindow;
  result.powerBufferRemainingHours = Math.round((powerWindow - hoursRequired) * 100) / 100; // e.g. 9.0 - 4.69 = 4.31 Hours buffer!
  
  result.sustainableStatus = hoursRequired <= powerWindow ? "OPTIMAL" : "DEFICIT";

  // Fertigation Concentration & Dosage
  const injectionLph = fertUnit?.injection_rate_lph || 50;
  result.fertigationInjectionLph = injectionLph;
  if (result.totalFarmFlowLph > 0) {
    result.fertigationPpm = Math.round((injectionLph / result.totalFarmFlowLph) * 1000000 * 0.8);
    result.nutrientGramsPerHourPerTree = Math.round((result.avgTreeFlowLph * (result.fertigationPpm / 1000)) * 10) / 10;
  }

  // Pressure Uniformity Index % (Christiansen Uniformity)
  const meanPressure = totalPressureSum / treeCount;
  let devSum = 0;
  farmData.trees.forEach(tree => {
    devSum += Math.abs(result.treePressures[tree.id] - meanPressure);
  });
  result.uniformityIndexPercent = Math.min(100, Math.max(50, Math.round((1 - devSum / (treeCount * meanPressure)) * 100)));

  // Heatmap for Custom Placed Component Lines & Valves
  comps.forEach((c: PlacableComponent) => {
    if (c.type === 'control_valve') {
      result.heatmap.pipes[c.id] = c.valve_state === 'closed' ? '#ef4444' : '#10b981';
    } else if (c.type === 'main_pipe') {
      result.heatmap.pipes[c.id] = '#3b82f6';
    } else if (c.type === 'subline') {
      result.heatmap.pipes[c.id] = '#06b6d4';
    } else if (c.type === 'ladder') {
      result.heatmap.pipes[c.id] = '#f59e0b';
    } else if (c.type === 'tree_drip_ring') {
      result.heatmap.pipes[c.id] = '#0284c7';
    }
  });

  return result;
}
