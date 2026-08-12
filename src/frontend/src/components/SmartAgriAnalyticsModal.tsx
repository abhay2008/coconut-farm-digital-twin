import React, { useState } from 'react';
import {
  calculateEvapotranspiration,
  calculatePondEvaporation,
  calculateFertigation,
  calculatePumpHeadLoss,
  calculateElectricityCost,
} from '../lib/agriPhysics';

interface SmartAgriAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalTreeCount: number;
}

export const SmartAgriAnalyticsModal: React.FC<SmartAgriAnalyticsModalProps> = ({
  isOpen,
  onClose,
  totalTreeCount,
}) => {
  const [activeTab, setActiveTab] = useState<'et0' | 'evaporation' | 'fertigation' | 'tdh' | 'power'>('et0');

  // Weather & Climate state
  const [temp, setTemp] = useState(34);
  const [humidity, setHumidity] = useState(55);
  const [solarRad, setSolarRad] = useState(22);

  // Fertigation state
  const [ppm, setPpm] = useState(500);
  const [stockConc, setStockConc] = useState(200);

  // TDH state
  const [pipeLen, setPipeLen] = useState(183);
  const [staticLift, setStaticLift] = useState(18);

  if (!isOpen) return null;

  const etResult = calculateEvapotranspiration({
    tempCelsius: temp,
    humidityPercent: humidity,
    solarRadiationMJ: solarRad,
    treeCount: totalTreeCount,
  });

  const evapResult = calculatePondEvaporation({
    tempCelsius: temp,
    humidityPercent: humidity,
    solarRadiationMJ: solarRad,
    pondSurfaceAreaM2: 500,
    pondCapacityLiters: 500000,
  });

  const fertResult = calculateFertigation({
    submersibleFlowLph: 35168,
    targetNpkRatio: '19-19-19',
    targetConcentrationPpm: ppm,
    solutionConcentrationGramsPerLiter: stockConc,
  });

  const tdhResult = calculatePumpHeadLoss({
    pipeLengthMeters: pipeLen,
    pipeDiameterMm: 110,
    flowLph: 35168,
    staticLiftMeters: staticLift,
    emitterPressureBar: 1.5,
  });

  const powerResult = calculateElectricityCost({
    borewellMotorHp: 7.5,
    submersibleMotorHp: 10,
    borewellRunHours: 2.53,
    irrigationRunHours: 5.54,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl text-white flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-2">
            <span className="text-xl">📊</span>
            <div>
              <h2 className="font-bold text-lg text-slate-100">Smart Agriculture & Physics Telemetry Suite</h2>
              <p className="text-xs text-slate-400">AP Transco 3-Phase Rural Grid & 25-Acre Hydraulics Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 pt-2 space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('et0')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'et0'
                ? 'border-cyan-400 text-cyan-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ☀️ Tree Water Demand (ET0)
          </button>
          <button
            onClick={() => setActiveTab('evaporation')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'evaporation'
                ? 'border-blue-400 text-blue-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🌊 Pond Solar Evaporation
          </button>
          <button
            onClick={() => setActiveTab('fertigation')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'fertigation'
                ? 'border-purple-400 text-purple-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🧪 Venturi Fertigation
          </button>
          <button
            onClick={() => setActiveTab('tdh')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'tdh'
                ? 'border-emerald-400 text-emerald-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            💧 Dynamic Head (TDH)
          </button>
          <button
            onClick={() => setActiveTab('power')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'power'
                ? 'border-amber-400 text-amber-300 bg-slate-800/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ AP Grid Power Tracking
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* TAB 1: ET0 */}
          {activeTab === 'et0' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-cyan-500/20 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Max Temp (°C)</label>
                  <input
                    type="number"
                    value={temp}
                    onChange={(e) => setTemp(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-cyan-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Relative Humidity (%)</label>
                  <input
                    type="number"
                    value={humidity}
                    onChange={(e) => setHumidity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-cyan-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Solar Rad (MJ/m²/day)</label>
                  <input
                    type="number"
                    value={solarRad}
                    onChange={(e) => setSolarRad(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-cyan-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Reference ET0</span>
                  <span className="text-2xl font-bold font-mono text-cyan-400">{etResult.et0MmPerDay} mm/day</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Crop Water Demand (Kc = 0.90)</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400">{etResult.etcMmPerDay} mm/day</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Water Target per Tree</span>
                  <span className="text-2xl font-bold font-mono text-amber-400">{etResult.litersPerTreePerDay} L / tree / day</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Required 10HP Submersible Pumping</span>
                  <span className="text-2xl font-bold font-mono text-purple-400">{etResult.recommendedIrrigationHours} Hours</span>
                  <span className="text-[10px] text-slate-400 block mt-1">(Comfortably fits in AP 9-hr window)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EVAPORATION */}
          {activeTab === 'evaporation' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-blue-500/20">
                <p className="text-slate-300 leading-relaxed">
                  Open water surfaces lose significant water to direct solar radiation and wind. 
                  Penman open-water evaporation calculations for the 500,000L central storage pond (500 m² surface area):
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px] mb-1">Daily Evaporation Depth</span>
                  <span className="text-2xl font-bold text-blue-400">{evapResult.dailyEvaporationMm} mm / day</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px] mb-1">Daily Pond Water Loss</span>
                  <span className="text-2xl font-bold text-cyan-400">{evapResult.dailyEvaporationLiters.toLocaleString()} Liters / day</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px] mb-1">Monthly Cumulative Evaporation</span>
                  <span className="text-2xl font-bold text-amber-400">{evapResult.monthlyEvaporationLiters.toLocaleString()} Liters / month</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30">
                  <span className="text-slate-400 block text-[10px] mb-1">% Daily Reservoir Capacity Loss</span>
                  <span className="text-2xl font-bold text-rose-400">{evapResult.percentDailyCapacityLoss}% / day</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FERTIGATION */}
          {activeTab === 'fertigation' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-purple-500/20 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Target NPK Concentration (PPM)</label>
                  <input
                    type="number"
                    value={ppm}
                    onChange={(e) => setPpm(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-purple-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Stock Solution Conc (g/L)</label>
                  <input
                    type="number"
                    value={stockConc}
                    onChange={(e) => setStockConc(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-purple-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Liquid Injection Rate</span>
                  <span className="text-xl font-bold font-mono text-purple-300">{fertResult.dosingRateLph} L/hr</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Venturi Vacuum Diff</span>
                  <span className="text-xl font-bold font-mono text-cyan-300">{fertResult.venturiSuctionMbar} mbar</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block mb-1">Total Stock for 5.54h</span>
                  <span className="text-xl font-bold font-mono text-amber-300">{fertResult.totalStockSolutionForIrrigationL} Liters</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TDH */}
          {activeTab === 'tdh' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-emerald-500/20 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1">Mainline Length (Meters)</label>
                  <input
                    type="number"
                    value={pipeLen}
                    onChange={(e) => setPipeLen(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-emerald-300 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Static Lift Head (Meters)</label>
                  <input
                    type="number"
                    value={staticLift}
                    onChange={(e) => setStaticLift(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-emerald-300 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Static Elevation</span>
                  <span className="text-base font-bold text-slate-200">{tdhResult.staticHeadM} m</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Hazen-Williams Friction</span>
                  <span className="text-base font-bold text-amber-400">{tdhResult.frictionHeadM} m</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Fitting & Minor Losses</span>
                  <span className="text-base font-bold text-slate-300">{tdhResult.fittingLossM} m</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-slate-400 text-[10px] block">Emitter Operating Head</span>
                  <span className="text-base font-bold text-cyan-400">{tdhResult.emitterHeadM} m</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 col-span-2">
                  <span className="text-slate-400 text-[10px] block">TOTAL DYNAMIC HEAD (TDH)</span>
                  <span className="text-xl font-bold text-emerald-400">{tdhResult.totalDynamicHeadM} Meters</span>
                  <span className="text-[10px] text-slate-400 ml-2">({tdhResult.requiredMotorHp} HP Required @ 70% Eff)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: POWER */}
          {activeTab === 'power' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/60 p-4 rounded-xl border border-emerald-500/40">
                <div className="flex items-center space-x-2 text-emerald-300 font-bold mb-1">
                  <span className="text-base">⚡</span>
                  <span>AP Government 100% Free Agricultural Electricity Policy</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  In Andhra Pradesh, 3-phase agricultural power for registered farmers is **100% Free of Cost (₹0 Electricity Bill)**. Energy consumption is tracked below strictly for AP Transco grid load and DTR transformer monitoring.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Borewell Fill Energy (2.53 hrs @ 15 HP)</span>
                  <span className="text-xl font-bold text-cyan-400">{powerResult.borewellKwh} kWh</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Submersible Energy (5.54 hrs @ 10 HP)</span>
                  <span className="text-xl font-bold text-purple-400">{powerResult.irrigationKwh} kWh</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 col-span-2 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Total Farm Energy Consumed</span>
                    <span className="text-2xl font-bold text-amber-300">{powerResult.totalKwh} kWh / day</span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 block text-[10px] uppercase tracking-wider font-bold">Total Electricity Bill</span>
                    <span className="text-3xl font-extrabold text-emerald-400">₹0 / day</span>
                    <span className="text-[10px] text-slate-400 block font-sans">100% Free Subsidized Power</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
