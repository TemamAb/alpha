import React, { useState } from 'react';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import ProfitFeed from './components/ProfitFeed';
import IntelligenceDashboard from './components/IntelligenceDashboard';
import NeuralAdvisor from './components/NeuralAdvisor';
import Settings from './components/Settings';
import StrategyMatrix from './components/StrategyMatrix';
import CorrelationHeatmap from './components/CorrelationHeatmap';
import RiskAlerts from './components/RiskAlerts';
import AdvancedRiskPanel from './components/AdvancedRiskPanel';
import PortfolioAttribution from './components/PortfolioAttribution';
import ExposureMatrix from './components/ExposureMatrix';
import PerformanceBenchmarking from './components/PerformanceBenchmarking';
import ExecutionQuality from './components/ExecutionQuality';
import OrderBookVisualizer from './components/OrderBookVisualizer';
import MEVProtection from './components/MEVProtection';
import ScenarioSimulator from './components/ScenarioSimulator';
import MonteCarloVisualizer from './components/MonteCarloVisualizer';
import StressTester from './components/StressTester';
import ModelPerformance from './components/ModelPerformance';
import FeatureImportance from './components/FeatureImportance';
import GPUUtilization from './components/GPUUtilization';
import { Terminal, Activity, Brain, Settings as SettingsIcon, LayoutGrid, Shield, PieChart, BarChart3, TrendingUp, Cpu, AlertTriangle } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'feed' | 'intel' | 'neural' | 'matrix' | 'risk' | 'portfolio' | 'execution' | 'analysis' | 'ai' | 'settings'>('feed');

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden text-gray-100">
      {/* Left Sidebar for Active Control */}
      <LeftSidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Tab Navigation */}
        <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 gap-1">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
              activeTab === 'feed' 
                ? 'bg-gray-800 text-blue-400 border-t-2 border-blue-500' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <Terminal size={14} />
            Live Feed
          </button>
          <button
            onClick={() => setActiveTab('intel')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
              activeTab === 'intel' 
                ? 'bg-gray-800 text-purple-400 border-t-2 border-purple-500' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <Activity size={14} />
            Intelligence
          </button>
          <button
            onClick={() => setActiveTab('neural')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
              activeTab === 'neural' 
                ? 'bg-gray-800 text-teal-400 border-t-2 border-teal-500' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <Brain size={14} />
            Neural Advisor
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
              activeTab === 'matrix'
                ? 'bg-gray-800 text-orange-400 border-t-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <LayoutGrid size={14} />
            Matrix
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
              activeTab === 'risk'
                ? 'bg-gray-800 text-red-400 border-t-2 border-red-500'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <Shield size={14} />
            Risk Analytics
          </button>
          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
              activeTab === 'portfolio'
                ? 'bg-gray-800 text-green-400 border-t-2 border-green-500'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <PieChart size={14} />
            Portfolio
          </button>
          <button
            onClick={() => setActiveTab('execution')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
              activeTab === 'execution'
                ? 'bg-gray-800 text-orange-400 border-t-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <BarChart3 size={14} />
            Execution
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
              activeTab === 'analysis'
                ? 'bg-gray-800 text-cyan-400 border-t-2 border-cyan-500'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <TrendingUp size={14} />
            Analysis
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
              activeTab === 'ai'
                ? 'bg-gray-800 text-purple-400 border-t-2 border-purple-500'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <Cpu size={14} />
            AI Monitor
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-colors ${
              activeTab === 'settings'
                ? 'bg-gray-800 text-gray-300 border-t-2 border-gray-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
            }`}
          >
            <SettingsIcon size={14} />
            Settings
          </button>
        </header>

        {/* Tab Content */}
        <div className="flex-1 p-4 flex flex-col overflow-hidden bg-gray-950 relative">
          {activeTab === 'feed' && <ProfitFeed />}
          {activeTab === 'intel' && <IntelligenceDashboard />}
          {activeTab === 'neural' && <NeuralAdvisor />}
          {activeTab === 'matrix' && <StrategyMatrix />}
          {activeTab === 'risk' && (
            <div className="flex-1 overflow-y-auto space-y-6">
              <AdvancedRiskPanel />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CorrelationHeatmap />
                <RiskAlerts />
              </div>
            </div>
          )}
          {activeTab === 'portfolio' && (
            <div className="flex-1 overflow-y-auto space-y-6">
              <PortfolioAttribution />
              <ExposureMatrix />
              <PerformanceBenchmarking />
            </div>
          )}
          {activeTab === 'execution' && (
            <div className="flex-1 overflow-y-auto space-y-6">
              <ExecutionQuality />
              <OrderBookVisualizer />
              <MEVProtection />
            </div>
          )}
          {activeTab === 'analysis' && (
            <div className="flex-1 overflow-y-auto space-y-6">
              <ScenarioSimulator />
              <MonteCarloVisualizer />
              <StressTester />
            </div>
          )}
          {activeTab === 'ai' && (
            <div className="flex-1 overflow-y-auto space-y-6">
              <ModelPerformance />
              <FeatureImportance />
              <GPUUtilization />
            </div>
          )}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>

      {/* Right Sidebar for Risk & Health Telemetry */}
      <RightSidebar />
    </div>
  );
};

export default App;