import React, { useState, useEffect } from 'react';
import { controlApi } from '../services/controlApi';

interface Strategy {
  id: string;
  name: string;
  active: boolean;
}

const LeftSidebar: React.FC = () => {
  // State for sliders
  const [capitalVelocity, setCapitalVelocity] = useState<number>(80);
  const [reinvestmentRate, setReinvestmentRate] = useState<number>(50);

  // State for strategies
  const [strategies, setStrategies] = useState<Strategy[]>([
    { id: 'spot', name: 'Spot Arbitrage', active: true },
    { id: 'gamma', name: 'Gamma Scalping', active: false },
    { id: 'perp', name: 'Perp Hedging', active: true },
    { id: 'options', name: 'Options Arb', active: false },
  ]);

  // Handler for slider changes
  const handleVelocityChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setCapitalVelocity(newValue);
    try {
      await controlApi.setCapitalVelocity(newValue);
      console.log(`Capital Velocity set to: ${newValue}%`);
    } catch (error) {
      console.error('Failed to set capital velocity:', error);
    }
  };

  const handleReinvestChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setReinvestmentRate(newValue);
    try {
      await controlApi.setReinvestmentRate(newValue);
      console.log(`Reinvestment Rate set to: ${newValue}%`);
    } catch (error) {
      console.error('Failed to set reinvestment rate:', error);
    }
  };

  // Handler for strategy toggles
  const toggleStrategy = async (id: string) => {
    const strategy = strategies.find(s => s.id === id);
    if (!strategy) return;

    const newActiveState = !strategy.active;

    // Optimistic update
    setStrategies(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, active: newActiveState };
      }
      return s;
    }));

    try {
      await controlApi.toggleStrategy(id, newActiveState);
      console.log(`Strategy ${id} toggled to: ${newActiveState}`);
    } catch (error) {
      console.error(`Failed to toggle strategy ${id}:`, error);
      // Revert on failure
      setStrategies(prev => prev.map(s => {
        if (s.id === id) return { ...s, active: !newActiveState };
        return s;
      }));
    }
  };

  // Emergency Stop Handler
  const handleEmergencyStop = async () => {
    if (window.confirm("⚠️ EMERGENCY STOP: Are you sure you want to halt all trading immediately?")) {
      console.error("EMERGENCY STOP TRIGGERED");
      try {
        await controlApi.emergencyStop();
      } catch (error) {
        console.error("Failed to trigger emergency stop:", error);
        alert("CRITICAL: Failed to execute emergency stop via API.");
      }
    }
  };

  return (
    <div className="h-full w-64 bg-gray-900 text-white border-r border-gray-700 flex flex-col p-4 font-mono text-sm shadow-xl z-10">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Command Center</h2>
        <div className="h-0.5 w-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>
      </div>

      {/* Trading Parameters Section */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-blue-400 mb-4 uppercase tracking-wide">Trading Parameters</h3>
        
        {/* Capital Velocity Slider */}
        <div className="mb-5">
          <div className="flex justify-between mb-2">
            <label className="text-xs text-gray-300">Capital Velocity</label>
            <span className="text-xs font-bold text-blue-300">{capitalVelocity}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={capitalVelocity} 
            onChange={handleVelocityChange}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
          />
        </div>

        {/* Reinvestment Rate Slider */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <label className="text-xs text-gray-300">Reinvest Rate</label>
            <span className="text-xs font-bold text-green-300">{reinvestmentRate}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={reinvestmentRate} 
            onChange={handleReinvestChange}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500 hover:accent-green-400 transition-all"
          />
        </div>
      </div>

      {/* Active Strategies Section */}
      <div className="mb-8 flex-grow">
        <h3 className="text-xs font-semibold text-purple-400 mb-4 uppercase tracking-wide">Active Strategies</h3>
        <div className="space-y-3">
          {strategies.map(strategy => (
            <div key={strategy.id} className="flex items-center justify-between group">
              <span className={`text-xs transition-colors ${strategy.active ? 'text-gray-200' : 'text-gray-500'}`}>
                {strategy.name}
              </span>
              <button 
                onClick={() => toggleStrategy(strategy.id)}
                className={`w-10 h-5 rounded-full flex items-center transition-all duration-300 focus:outline-none ${
                  strategy.active ? 'bg-green-600 shadow-[0_0_8px_rgba(22,163,74,0.4)]' : 'bg-gray-700'
                }`}
              >
                <div className={`w-3 h-3 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                  strategy.active ? 'translate-x-6' : 'translate-x-1'
                }`}></div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Stop Section */}
      <div className="mt-auto pt-4 border-t border-gray-800">
        <button 
          onClick={handleEmergencyStop}
          className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-red-100 font-bold py-3 px-4 rounded border border-red-700 shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <span className="text-xl group-hover:animate-pulse">🛑</span> 
          <span className="tracking-wider">EMERGENCY STOP</span>
        </button>
        <p className="text-[10px] text-center text-gray-500 mt-2 italic">
          Force halts all execution engines.
        </p>
      </div>
    </div>
  );
};

export default LeftSidebar;