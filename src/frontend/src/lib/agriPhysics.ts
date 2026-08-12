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

  // Approximate ET0 using temperature and radiation (Hargreaves method approximation)
  // ET0 = 0.0023 * (Tmean + 17.8) * (Tmax - Tmin)^0.5 * Ra
  const tMean = tempCelsius;
  const humidityCorrection = 1 - (humidityPercent - 50) / 200; // slight correction for relative humidity
  const et0 = Math.max(3.0, (0.0023 * (tMean + 17.8) * Math.sqrt(Math.max(4, 12)) * (solarRadiationMJ * 0.408)) * humidityCorrection);
  
  const etc = et0 * kcFactor;
  // Coconut palm canopy effective area ~36 m^2 (6m x 6m spacing)
  const canopyAreaM2 = 36;
  const litersPerTree = Math.round(etc * canopyAreaM2);
  const totalFarmLiters = litersPerTree * treeCount;
  
  // 10HP Submersible Pump flow = 35,168 L/hr
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

  // Formula: Dosing Rate (L/hr) = (Water Flow L/hr * Target PPM) / (Stock Concentration g/L * 1000)
  const dosingRate = (submersibleFlowLph * targetConcentrationPpm) / (solutionConcentrationGramsPerLiter * 1000);
  
  // Venturi differential pressure estimate (approx 0.35 bar per 50 L/hr injection rate)
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
  const c = 140; // PVC pipe roughness coefficient

  // Hazen-Williams Friction Head Loss: hf = 10.67 * L * Q^1.852 / (C^1.852 * D^4.87)
  const frictionM = 10.67 * pipeLengthMeters * Math.pow(flowM3s, 1.852) / (Math.pow(c, 1.852) * Math.pow(dMeters, 4.87));
  const fittingM = frictionM * 0.10;
  const emitterM = emitterPressureBar * 10.197; // 1 bar ≈ 10.197m head
  
  const tdhM = staticLiftMeters + frictionM + fittingM + emitterM;
  
  // Hydraulic Power P_kW = (Q_m3s * rho * g * TDH) / 1000
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
  tariffRatePerKwhInr?: number;// AP Transco subsidized agri rate ~ ₹1.50/kWh (or commercial ₹7.00/kWh)
}

export interface ElectricityCostResult {
  borewellKwh: number;
  irrigationKwh: number;
  totalKwh: number;
  costInrSubsidized: number;  // @ ₹1.50/kWh
  costInrCommercial: number;  // @ ₹7.50/kWh
}

/**
 * AP Transco Agricultural Grid Electricity & Tariff Calculator
 */
export function calculateElectricityCost(input: ElectricityCostInput): ElectricityCostResult {
  const { borewellMotorHp, submersibleMotorHp, borewellRunHours, irrigationRunHours } = input;

  // 1 HP = 0.7457 kW
  const borewellKw = borewellMotorHp * 2 * 0.7457; // 2 concurrent motors
  const subKw = submersibleMotorHp * 0.7457;

  const borewellKwh = Number((borewellKw * borewellRunHours).toFixed(2));
  const subKwh = Number((subKw * irrigationRunHours).toFixed(2));
  const totalKwh = Number((borewellKwh + subKwh).toFixed(2));

  return {
    borewellKwh,
    irrigationKwh: subKwh,
    totalKwh,
    costInrSubsidized: Math.round(totalKwh * 1.50),
    costInrCommercial: Math.round(totalKwh * 7.50),
  };
}
