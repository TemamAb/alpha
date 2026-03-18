import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Play, RotateCcw, TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface ScenarioParameters {
  capital: number;
  volatility: number;
  correlation: number;
  timeHorizon: number;
  confidenceLevel: number;
}

interface ScenarioResult {
  scenario: string;
  expectedReturn: number;
  worstCase: number;
  bestCase: number;
  sharpeRatio: number;
  maxDrawdown: number;
  var95: number;
}

interface SimulationData {
  time: number;
  baseline: number;
  scenario: number;
  upperBound: number;
  lowerBound: number;
}

const ScenarioSimulator: React.FC = () => {
  const [parameters, setParameters] = useState<ScenarioParameters>({
    capital: 100000,
    volatility: 25,
    correlation: 0.3,
    timeHorizon: 30,
    confidenceLevel: 95
  });

  const [results, setResults] = useState<ScenarioResult[]>([
    {
      scenario: 'Base Case',
      expectedReturn: 8.5,
      worstCase: -12.3,
      bestCase: 28.7,
      sharpeRatio: 1.8,
      maxDrawdown: 15.2,
      var95: 18.5
    },
    {
      scenario: 'Bull Market',
      expectedReturn: 15.2,
      worstCase: -5.1,
      bestCase: 45.8,
      sharpeRatio: 2.3,
      maxDrawdown: 8.9,
      var95: 12.1
    },
    {
      scenario: 'Bear Market',
      expectedReturn: -8.7,
      worstCase: -35.4,
      bestCase: 5.2,
      sharpeRatio: 0.4,
      maxDrawdown: 42.1,
      var95: 28.7
    },
    {
      scenario: 'High Volatility',
      expectedReturn: 12.1,
      worstCase: -28.9,
      bestCase: 52.3,
      sharpeRatio: 1.2,
      maxDrawdown: 35.6,
      var95: 32.4
    }
  ]);

  const [simulationData, setSimulationData] = useState<SimulationData[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>('Base Case');

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'SCENARIO_UPDATE') {
      const { results: newResults, simulation } = lastMessage.payload;
      if (newResults) setResults(newResults);
      if (simulation) setSimulationData(simulation);
    }
  }, [lastMessage]);

  // Generate sample simulation data
  useEffect(() => {
    const generateSimulation = () => {
      const data = [];
      let baseline = 100000;
      let scenario = 100000;

      for (let i = 0; i <= parameters.timeHorizon; i++) {
        const time = i;
        const randomChange = (Math.random() - 0.5) * parameters.volatility / 100;
        const correlatedChange = randomChange * (1 + parameters.correlation);

        baseline += baseline * (randomChange * 0.5);
        scenario += scenario * correlatedChange;

        const volatility = parameters.volatility / 100;
        const upperBound = scenario * (1 + volatility * 2);
        const lowerBound = scenario * (1 - volatility * 2);

        data.push({
          time,
          baseline: baseline / 1000, // Convert to thousands for display
          scenario: scenario / 1000,
          upperBound: upperBound / 1000,
          lowerBound: lowerBound / 1000
        });
      }
      setSimulationData(data);
    };

    generateSimulation();
  }, [parameters]);

  const runSimulation = async () => {
    setIsRunning(true);
    // Simulate API call delay
    setTimeout(() => {
      setIsRunning(false);
    }, 2000);
  };

  const resetParameters = () => {
    setParameters({
      capital: 100000,
      volatility: 25,
      correlation: 0.3,
      timeHorizon: 30,
      confidenceLevel: 95
    });
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-semibold">Day {label}</p>
          <p className="text-blue-400">Baseline: {formatCurrency(payload[0]?.value * 1000 || 0)}</p>
          <p className="text-green-400">Scenario: {formatCurrency(payload[1]?.value * 1000 || 0)}</p>
          <p className="text-purple-400">Upper: {formatCurrency(payload[2]?.value * 1000 || 0)}</p>
          <p className="text-red-400">Lower: {formatCurrency(payload[3]?.value * 1000 || 0)}</p>
        </div>
      );
    }
    return null;
  };

  const selectedResult = results.find(r => r.scenario === selectedScenario) || results[0];

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <Target size={20} />
          Scenario Simulator
        </h3>
        <div className="flex items-center gap-4">
          <button
            onClick={resetParameters}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg transition-colors"
          >
            <Play size={16} />
            {isRunning ? 'Running...' : 'Run Simulation'}
          </button>
        </div>
      </div>

      {/* Parameter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Initial Capital</label>
          <input
            type="number"
            value={parameters.capital}
            onChange={(e) => setParameters({...parameters, capital: Number(e.target.value)})}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Volatility (%)</label>
          <input
            type="number"
            value={parameters.volatility}
            onChange={(e) => setParameters({...parameters, volatility: Number(e.target.value)})}
            min="0"
            max="100"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Correlation</label>
          <input
            type="number"
            value={parameters.correlation}
            onChange={(e) => setParameters({...parameters, correlation: Number(e.target.value)})}
            min="-1"
            max="1"
            step="0.1"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Time Horizon (Days)</label>
          <input
            type="number"
            value={parameters.timeHorizon}
            onChange={(e) => setParameters({...parameters, timeHorizon: Number(e.target.value)})}
            min="1"
            max="365"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Confidence (%)</label>
          <input
            type="number"
            value={parameters.confidenceLevel}
            onChange={(e) => setParameters({...parameters, confidenceLevel: Number(e.target.value)})}
            min="90"
            max="99"
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
          />
        </div>
      </div>

      {/* Simulation Chart */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Portfolio Simulation ({parameters.timeHorizon} Days)</h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simulationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="time"
                stroke="#9CA3AF"
                fontSize={12}
                label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={12}
                label={{ value: 'Portfolio Value (K)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="upperBound"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.1}
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                stackId="2"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.1}
              />
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="#6b7280"
                strokeWidth={2}
                dot={false}
                name="Baseline"
              />
              <Line
                type="monotone"
                dataKey="scenario"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                name="Scenario"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scenario Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scenario Selection */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Scenario Analysis</h4>
          <div className="space-y-2">
            {results.map((result) => (
              <div
                key={result.scenario}
                onClick={() => setSelectedScenario(result.scenario)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedScenario === result.scenario
                    ? 'bg-blue-900/30 border border-blue-500'
                    : 'bg-gray-800/50 hover:bg-gray-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-200">{result.scenario}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono ${
                      result.expectedReturn >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {result.expectedReturn >= 0 ? '+' : ''}{formatPercentage(result.expectedReturn)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Scenario Details */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">{selectedScenario} Details</h4>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-800/50 rounded">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Expected Return</p>
                <p className={`text-lg font-bold ${
                  selectedResult.expectedReturn >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {selectedResult.expectedReturn >= 0 ? '+' : ''}{formatPercentage(selectedResult.expectedReturn)}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Sharpe Ratio</p>
                <p className="text-lg font-bold text-purple-400">{selectedResult.sharpeRatio.toFixed(1)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-800/50 rounded">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Best Case</p>
                <p className="text-lg font-bold text-green-400">+{formatPercentage(selectedResult.bestCase)}</p>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Worst Case</p>
                <p className="text-lg font-bold text-red-400">{formatPercentage(selectedResult.worstCase)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-800/50 rounded">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Max Drawdown</p>
                <p className="text-lg font-bold text-orange-400">{formatPercentage(selectedResult.maxDrawdown)}</p>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded">
                <p className="text-xs text-gray-400 uppercase tracking-wider">VaR (95%)</p>
                <p className="text-lg font-bold text-yellow-400">{formatPercentage(selectedResult.var95)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioSimulator;
