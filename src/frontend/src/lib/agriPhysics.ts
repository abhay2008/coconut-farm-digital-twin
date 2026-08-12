/**
 * Real-World Agricultural Physics & Hydrology Calculations
 * Specifically calibrated for AP 3-Phase Rural Grid & 25-Acre Coconut Plantation (1,300 Trees)
 */

export interface EvapotranspirationInput {
  tempCelsius: number;        // e.g. 34 °C (AP Summer)
  humidityPercent: number;    // e.g. 55 %
  solarRadiationMJ: number;   // e.g. 22 MJ/m^2/day
  windSpeedMs?: number;       // e.g. 2.5 m/s
  treeCount: number;          // 1300 trees
  kcFactor?: number;          // Crop coefficient for mature coconut palms (~0.85 - 0.95)
}

export interface EvapotranspirationResult {
  et0MmPerDay: number;         // Reference evapotranspiration (mm/day)
  etcMmPerDay: number;         // Crop evapotranspiration (mm/day)
  litersPerTreePerDay: number; // Recommended water per tree per day (L)
  totalFarmWaterLiters: number;// Total farm requirement per day (L)
  recommendedIrrigationHours: number; // Run time required at 35,168 L/hr submersible flow
}

/**
 * FAO-56 Hargreaves-Samani Simplified Evapotranspiration Calculator
 */
export function calculateEvapotranspiration(input: EvapotranspirationInput): EvapotranspirationResult {
  const {
    tempCelsius,
    humidityPercent,
    solarRadiationMJ,
    treeCount,
    kcFactor = 0.90,
  } = input;

  const tMean = tempCelsius;
  const humidityCorrection = 1 - (humidityPercent - 50) / 200;
  const et0 = Math.max(3.0, (0.0023 * (tMean + 17.8) * Math.sqrt(Math.max(4, 12)) * (solarRadiationMJ * 0.408)) * humidityCorrection);
  
  const etc = et0 * kcFactor;
  const canopyAreaM2 = 36; // 6m x 6m spacing
  const litersPerTree = Math.round(etc * canopyAreaM2);
  const totalFarmLiters = litersPerTree * treeCount;
  
  const submersibleLph = 35168;
  const recommendedHours = Number((totalFarmLiters / submersibleLph).toFixed(2));

  return {
    et0MmPerDay: Number(et0.toFixed(2)),
    etcMmPerDay: Number(etc.toFixed(2)),
    litersPerTreePerDay: litersPerTree,
    totalFarmWaterLiters: totalFarmLiters,
    recommendedIrrigationHours: recommendedHours,
  };
}

export interface PondEvaporationInput {
  tempCelsius: number;        // e.g. 34 °C
  humidityPercent: number;    // e.g. 55 %
  solarRadiationMJ: number;   // e.g. 22 MJ/m^2/day
  pondSurfaceAreaM2?: number; // e.g. 500 m^2 surface area for 500kL pond
  pondCapacityLiters?: number;// 500,000 L
}

export interface PondEvaporationResult {
  dailyEvaporationMm: number;        // Open water evaporation rate (mm/day)
  dailyEvaporationLiters: number;    // Total volume lost to atmosphere per day (L/day)
  monthlyEvaporationLiters: number;  // Cumulative monthly evaporation loss (L/month)
  percentDailyCapacityLoss: number;  // % of 500,000L pond lost daily to solar heat & wind
}

/**
 * Open-Water Surface Pond Evaporation Calculator (Penman Open Water Model)
 */
export function calculatePondEvaporation(input: PondEvaporationInput): PondEvaporationResult {
  const {
    tempCelsius,
    humidityPercent,
    solarRadiationMJ,
    pondSurfaceAreaM2 = 500,
    pondCapacityLiters = 500000,
  } = input;

  // Open-water evaporation multiplier ~1.15 to 1.25 x ET0 due to direct unshaded solar exposure
  const et0 = 0.0023 * (tempCelsius + 17.8) * Math.sqrt(10) * (solarRadiationMJ * 0.408) * (1 - (humidityPercent - 50) / 250);
  const openWaterEvapMm = Math.max(3.5, et0 * 1.20);
  
  // Volume (Liters) = Area (m^2) * Depth (mm) [since 1 mm depth on 1 m^2 = 1 Liter]
  const dailyLiters = Math.round(pondSurfaceAreaM2 * openWaterEvapMm);
  const monthlyLiters = dailyLiters * 30;
  const percentLoss = Number(((dailyLiters / pondCapacityLiters) * 100).toFixed(2));

  return {
    dailyEvaporationMm: Number(openWaterEvapMm.toFixed(2)),
    dailyEvaporationLiters: dailyLiters,
    monthlyEvaporationLiters: monthlyLiters,
    percentDailyCapacityLoss: percentLoss,
  };
}

export interface FertigationInput {
  submersibleFlowLph: number; // 35,168 L/hr
  targetNpkRatio: string;     // e.g. "19-19-19"
  targetConcentrationPpm: number; // e.g. 500 PPM
  solutionConcentrationGramsPerLiter: number; // e.g. 200 g/L stock solution
}

export interface FertigationResult {
  dosingRateLph: number;      // Liquid stock injection rate (L/hr)
  venturiSuctionMbar: number; // Required Venturi pressure differential (mbar)
  totalStockSolutionForIrrigationL: number; // Total stock solution for 5.54 hr run
}

/**
 * Venturi Dosing & Liquid Fertigation Injection Rate Calculation
 */
export function calculateFertigation(input: FertigationInput): FertigationResult {
  const { submersibleFlowLph, targetConcentrationPpm, solutionConcentrationGramsPerLiter } = input;

  const dosingRate = (submersibleFlowLph * targetConcentrationPpm) / (solutionConcentrationGramsPerLiter * 1000);
  const venturiMbar = Math.round((dosingRate / 50) * 350);
  const totalStockFor5Hours = Math.round(dosingRate * 5.54);

  return {
    dosingRateLph: Number(dosingRate.toFixed(1)),
    venturiSuctionMbar: Math.max(150, venturiMbar),
    totalStockSolutionForIrrigationL: totalStockFor5Hours,
  };
}

export interface PumpHeadLossInput {
  pipeLengthMeters: number;   // 183m mainline run
  pipeDiameterMm: number;     // 110mm
  flowLph: number;            // 35,168 L/hr = 586.13 LPM
  staticLiftMeters: number;   // 18m pond-to-header lift
  emitterPressureBar: number; // 1.5 bar required at drip emitter
}

export interface PumpHeadLossResult {
  staticHeadM: number;        // Static elevation lift (m)
  frictionHeadM: number;      // Pipe friction loss (m) using Hazen-Williams (C=140 for PVC)
  fittingLossM: number;       // Minor losses from valves/bends (10% of friction)
  emitterHeadM: number;       // Operating head at drippers (m)
  totalDynamicHeadM: number;  // Total Dynamic Head (TDH in meters)
  requiredPumpKw: number;     // Hydrauic Power required (kW)
  requiredMotorHp: number;    // Recommended Motor Rating (HP) with 70% efficiency
}

/**
 * Total Dynamic Head (TDH) & Pump Friction Breakdown Calculator
 */
export function calculatePumpHeadLoss(input: PumpHeadLossInput): PumpHeadLossResult {
  const { pipeLengthMeters, pipeDiameterMm, flowLph, staticLiftMeters, emitterPressureBar } = input;

  const flowLps = flowLph / 3600;
  const flowM3s = flowLps / 1000;
  const dMeters = pipeDiameterMm / 1000;
  const c = 140;

  const frictionM = 10.67 * pipeLengthMeters * Math.pow(flowM3s, 1.852) / (Math.pow(c, 1.852) * Math.pow(dMeters, 4.87));
  const fittingM = frictionM * 0.10;
  const emitterM = emitterPressureBar * 10.197;
  
  const tdhM = staticLiftMeters + frictionM + fittingM + emitterM;
  
  const rho = 1000;
  const g = 9.81;
  const hydraulicKw = (flowM3s * rho * g * tdhM) / 1000;
  const pumpEff = 0.70;
  const motorKw = hydraulicKw / pumpEff;
  const motorHp = motorKw * 1.341;

  return {
    staticHeadM: Number(staticLiftMeters.toFixed(2)),
    frictionHeadM: Number(frictionM.toFixed(2)),
    fittingLossM: Number(fittingM.toFixed(2)),
    emitterHeadM: Number(emitterM.toFixed(2)),
    totalDynamicHeadM: Number(tdhM.toFixed(2)),
    requiredPumpKw: Number(hydraulicKw.toFixed(2)),
    requiredMotorHp: Number(motorHp.toFixed(2)),
  };
}

export interface ElectricityCostInput {
  borewellMotorHp: number;     // 7.5 HP x 2 = 15 HP
  submersibleMotorHp: number;  // 10 HP
  borewellRunHours: number;    // e.g. 2.53 hrs
  irrigationRunHours: number;  // e.g. 5.54 hrs
}

export interface ElectricityCostResult {
  borewellKwh: number;
  irrigationKwh: number;
  totalKwh: number;
  costInrFarmer: number;       // ₹0 / kWh (AP Free Agri Electricity Policy for Farmers)
  note: string;
}

/**
 * AP Transco Agricultural Grid Energy Consumption (100% Free Power for AP Farmers)
 */
export function calculateElectricityCost(input: ElectricityCostInput): ElectricityCostResult {
  const { borewellMotorHp, submersibleMotorHp, borewellRunHours, irrigationRunHours } = input;

  const borewellKw = borewellMotorHp * 2 * 0.7457; // 2 concurrent motors
  const subKw = submersibleMotorHp * 0.7457;

  const borewellKwh = Number((borewellKw * borewellRunHours).toFixed(2));
  const subKwh = Number((subKw * irrigationRunHours).toFixed(2));
  const totalKwh = Number((borewellKwh + subKwh).toFixed(2));

  return {
    borewellKwh,
    irrigationKwh: subKwh,
    totalKwh,
    costInrFarmer: 0, // AP Govt 100% Free Agri Power Policy
    note: "AP Govt provides 9 Hours 100% Free 3-Phase Electricity to AP Farmers (₹0 Tariff)",
  };
}
