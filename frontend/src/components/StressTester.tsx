import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertTriangle, Zap, TrendingDown, Shield, Play, RotateCcw } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface StressTestScenario {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'extreme';
  parameters: {
    marketCrash: number;
    volatilitySpike: number;
    liquidityDryUp: number;
    correlationBreakdown: boolean;
  };
}

interface StressTestResult {
  scenarioId: string;
  portfolioValue: number;
  drawdown: number;
  var99: number;
  liquidityStress: number;
  recoveryTime: number;
  breachedLimits: string[];
}

interface StressTestData {
  time: number;
  portfolioValue: number;
  drawdown: number;
  liquidityRatio: number;
}

const StressTester: React.FC = () => {
  const [scenarios] = useState<StressTestScenario[]>([
    {
      id: 'flash-crash',
      name: 'Flash Crash 2.0',
      description: 'Sudden 50% market drop followed by rapid recovery',
      severity: 'high',
      parameters: {
        marketCrash: 50,
        volatilitySpike: 200,
        liquidityDryUp: 80,
        correlationBreakdown: false
      }
    },
    {
      id: 'liquidity-crisis',
      name: 'Liquidity Crisis',
      description: 'Gradual liquidity evaporation over 30 days',
      severity: 'extreme',
      parameters: {
        marketCrash: 0,
        volatilitySpike: 50,
        liquidityDryUp: 95,
        correlationBreakdown: false
      }
    },
    {
      id: 'correlation-breakdown',
      name: 'Correlation Breakdown',
      description: 'Traditional correlations break down completely',
      severity: 'medium',
      parameters: {
        marketCrash: 20,
        volatilitySpike: 100,
        liquidityDryUp: 30,
        correlationBreakdown: true
      }
    },
    {
      id: 'black-swan',
      name: 'Black Swan Event',
      description: 'Extreme 80% market crash with permanent damage',
      severity: 'extreme',
      parameters: {
        marketCrash: 80,
        volatilitySpike: 300,
        liquidityDryUp: 99,
        correlationBreakdown: true
      }
    }
  ]);

  const [selectedScenario, setSelectedScenario] = useState<string>('flash-crash');
  const [results, setResults] = useState<StressTestResult[]>([]);
  const [testData, setTestData] = useState<StressTestData[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'STRESS_TEST_UPDATE') {
      const { results: newResults, data } = lastMessage.payload;
      if (newResults) setResults(newResults);
      if (data) setTestData(data);
    }
  }, [lastMessage]);

  const runStressTest = async () => {
    setIsRunning(true);
    // Simulate stress test execution
    setTimeout(() => {
      // Generate sample results based on selected scenario
      const scenario = scenarios.find(s => s.id === selectedScenario);
      if (scenario) {
        const mockResults: StressTestResult[] = [{
          scenarioId: selectedScenario,
          portfolioValue: 100000 * (1 - scenario.parameters.marketCrash / 100),
          drawdown: scenario.parameters.marketCrash,
          var99: scenario.parameters.marketCrash * 1.5,
          liquidityStress: scenario.parameters.liquidityDryUp,
          recoveryTime: scenario.parameters.marketCrash > 50 ? 90 : 30,
          breachedLimits: scenario.parameters.marketCrash > 30 ? ['Stop Loss', 'VaR Limit'] : []
        }];
        setResults(mockResults);

        // Generate sample time series data
        const data = [];
        for (let i = 0; i <= 30; i++) {
          const crashProgress = Math.min(i / 10, 1); // Crash happens in first 10 days
          const recoveryProgress = Math.max(0, (i - 10) / 20); // Recovery over next 20 days

          const portfolioValue = 100000 * (1 - (scenario.parameters.marketCrash / 100) * crashProgress +
            (scenario.parameters.marketCrash / 100) * recoveryProgress * 0.7);

          const drawdown = Math.max(0, (100000 - portfolioValue) / 100000);
          const liquidityRatio = 1 - (scenario.parameters.liquidityDryUp / 100) * Math.min(i / 15, 1);

          data.push({
            time: i,
            portfolioValue,
            drawdown,
            liquidityRatio
          });
        }
        setTestData(data);
      }
      setIsRunning(false);
    }, 3000);
  };

  const resetTest = () => {
    setResults([]);
    setTestData([]);
    setSelectedScenario('flash-crash');
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-400 bg-green-900/30';
      case 'medium': return 'text-yellow-400 bg-yellow-900/30';
      case 'high': return 'text-orange-400 bg-orange-900/30';
      case 'extreme': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const selectedScenarioData = scenarios.find(s => s.id === selectedScenario);
  const currentResult = results.find(r => r.scenarioId === selectedScenario);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-semibold">Day {label}</p>
          <p className="text-blue-400">Portfolio: {formatCurrency(payload[0]?.value || 0)}</p>
          <p className="text-red-400">Drawdown: {formatPercentage(payload[1]?.value || 0)}</p>
          <p className="text-green-400">Liquidity: {formatPercentage(payload[2]?.value || 0)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <AlertTriangle size={20} />
          Stress Tester
        </h3>
        <div className="flex items-center gap-4">
          <button
            onClick={resetTest}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            onClick={runStressTest}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 rounded-lg transition-colors"
          >
            <Play size={16} />
            {isRunning ? 'Running Test...' : 'Run Stress Test'}
          </button>
        </div>
      </div>

      {/* Scenario Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            onClick={() => setSelectedScenario(scenario.id)}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              selectedScenario === scenario.id
                ? 'border-red-500 bg-red-900/20'
                : 'border-gray-700 bg-gray-900/60 hover:bg-gray-800'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-200">{scenario.name}</h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(scenario.severity)}`}>
                {scenario.severity}
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-3">{scenario.description}</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Market Crash:</span>
                <span className="text-red-400">{scenario.parameters.marketCrash}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Liquidity Loss:</span>
                <span className="text-orange-400">{scenario.parameters.liquidityDryUp}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Test Results */}
      {currentResult && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Final Portfolio</p>
                <p className="text-xl font-bold text-blue-400">{formatCurrency(currentResult.portfolioValue)}</p>
              </div>
              <TrendingDown className="text-blue-400" size={24} />
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Max Drawdown</p>
                <p className="text-xl font-bold text-red-400">{formatPercentage(currentResult.drawdown / 100)}</p>
              </div>
              <TrendingDown className="text-red-400" size={20} />
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">VaR (99%)</p>
                <p className="text-xl font-bold text-orange-400">{formatPercentage(currentResult.var99 / 100)}</p>
              </div>
              <Shield className="text-orange-400" size={20} />
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Recovery Time</p>
                <p className="text-xl font-bold text-green-400">{currentResult.recoveryTime} days</p>
              </div>
              <Zap className="text-green-400" size={20} />
            </div>
          </div>
        </div>
      )}

      {/* Stress Test Chart */}
      {testData.length > 0 && (
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">
            Stress Test Simulation: {selectedScenarioData?.name}
          </h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={testData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  stroke="#9CA3AF"
                  fontSize={12}
                  label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  yAxisId="portfolio"
                  orientation="left"
                  stroke="#3b82f6"
                  fontSize={12}
                  tickFormatter={formatCurrency}
                  label={{ value: 'Portfolio Value', angle: -90, position: 'insideLeft' }}
                />
                <YAxis
                  yAxisId="percentage"
                  orientation="right"
                  stroke="#ef4444"
                  fontSize={12}
                  tickFormatter={formatPercentage}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  yAxisId="portfolio"
                  type="monotone"
                  dataKey="portfolioValue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={false}
                  name="Portfolio Value"
                />
                <Line
                  yAxisId="percentage"
                  type="monotone"
                  dataKey="drawdown"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="Drawdown"
                />
                <Line
                  yAxisId="percentage"
                  type="monotone"
                  dataKey="liquidityRatio"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="Liquidity Ratio"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Breached Limits Alert */}
      {currentResult && currentResult.breachedLimits.length > 0 && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-400" />
            <h4 className="text-sm font-semibold text-red-400">Risk Limits Breached</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentResult.breachedLimits.map((limit, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-red-900/40 text-red-300 rounded-full text-xs font-medium"
              >
                {limit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Risk Assessment Summary */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Risk Assessment Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Liquidity Stress Test</p>
              <p className="text-lg font-bold text-blue-400">
                {currentResult ? formatPercentage(currentResult.liquidityStress / 100) : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">Liquidity evaporated</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Worst Case Loss</p>
              <p className="text-lg font-bold text-red-400">
                {currentResult ? formatPercentage(currentResult.drawdown / 100) : 'N/A'}
              </p>
              <p className="text-xs text-gray-500">Maximum drawdown</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Capital Preservation</p>
              <p className="text-lg font-bold text-green-400">
                {currentResult ? formatPercentage((currentResult.portfolioValue / 100000) * 100) : '100.0%'}
              </p>
              <p className="text-xs text-gray-500">Remaining capital</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StressTester;
