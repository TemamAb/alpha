import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { BotRole, BotStatus, BotState, Strategy, WalletStats, ChampionWallet } from './types';
import { forgeEnterpriseAlpha } from './services/geminiService';
import { ProductionDataService, RealTimeData } from './services/productionDataService';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import WalletManager from './components/WalletManager';
import AITerminal from './components/AITerminal';
import TreasuryPage from './pages/TreasuryPage'; // Import the new page
import RiskHeatmap from '../RiskHeatmap';
import SettingsComponent from '../Settings';
import {
  Sparkles, LayoutDashboard, Gauge, Cpu, Activity, Clock, Fuel,
  PieChart, Target, Database, Zap, Terminal, Wallet, Rocket, Menu, X, ShieldCheck, AlertTriangle, Loader, CheckCircle2, Settings, Sliders
} from 'lucide-react';

type MetricView =
  | 'core-metrics'
  | 'security-metrics'
  | 'ai-optimization'
  | 'bot-fleets'
  | 'latency-metrics'
  | 'gas-metrics'
  | 'profit-reinvestment'
  | 'champion-discovery'
  | 'deployment-registry'
  | 'profit-withdrawal'
  | 'flash-loan-providers'
  | 'blockchain-streaming'
  | 'ai-terminal' // Existing AI Terminal view
  | 'treasury-balance' // New: Treasury Balance view
  | 'connect-wallet'
  | 'deploy-engine'
  | 'settings'
  | 'strategy-control';

const playSuccessSound = (volume: number) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    oscillator.frequency.linearRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error('Audio playback failed', e);
  }
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<MetricView>('core-metrics');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Production data service
  const [productionService, setProductionService] = useState<ProductionDataService | null>(null);
  const [realTimeData, setRealTimeData] = useState<RealTimeData>({
    balance: '0.00',
    profits: 0,
    txCount: 0,
    pairCount: 0,
    strategyCount: 0,
    blockNumber: 0,
    gasPrice: '0',
    validatedTransactions: 0,
    mevProtectionRate: 0,
    attemptsBlocked: 0,
    lossPrevented: 0,
    sandwichPreventionRate: 0,
    frontrunProtectionRate: 0,
    backrunDefenseRate: 0
  });

  const [bots, setBots] = useState<BotState[]>([
    { id: 'bot-1', role: BotRole.ORCHESTRATOR, status: BotStatus.IDLE, lastAction: 'Initializing...', uptime: 0, cpuUsage: 0 },
    { id: 'bot-2', role: BotRole.SCANNER, status: BotStatus.IDLE, lastAction: 'Standby', uptime: 0, cpuUsage: 0 },
    { id: 'bot-3', role: BotRole.EXECUTOR, status: BotStatus.IDLE, lastAction: 'Ready', uptime: 0, cpuUsage: 0 },
  ]);

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [champions, setChampions] = useState<ChampionWallet[]>([]);

  const [wallet] = useState<WalletStats>({
    address: 'Not Connected',
    balance: '0.00 USDC',
    totalProfit: '0.00 USDC',
    gasSaved: '0.00 USDC',
    accountType: 'ERC-4337 (Pimlico)'
  });

  const [isAIThinking, setIsAIThinking] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<string>('');
  const [isEngineRunning, setIsEngineRunning] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [soundVolume, setSoundVolume] = useState(0.2);

  // New state for profit update animation
  const [isProfitUpdated, setIsProfitUpdated] = useState(false);
  const prevProfitRef = useRef(realTimeData.profits);

  // Initialize ProductionDataService
  useEffect(() => {
    const initService = async () => {
      try {
        const service = new ProductionDataService('ARBITRUM_SEPOLIA');
        await service.initialize();
        setProductionService(service);
        console.log('✅ ProductionDataService initialized');
      } catch (error) {
        console.error('❌ Failed to initialize ProductionDataService:', error);
      }
    };
    initService();
  }, []);

  const handleEngineStart = () => {
    setIsLaunching(true);

    setTimeout(() => {
      setIsEngineRunning(true);
      setShowDeployModal(false);
      setIsLaunching(false);
      
      // Show success toast
      setToastMessage('Arbitrage Engine Deployed Successfully');
      playSuccessSound(soundVolume);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);

      // Create a new deployment record for the registry
      if (connectedWallet) {
        const newDeployment = {
          id: `deploy-${Date.now()}`,
          deploymentCode: `ORION-HFT-${Math.floor(Math.random() * 900) + 100}`,
          date: new Date().toLocaleString(),
          timestamp: Date.now(),
          smartWalletAddress: `0x748A${connectedWallet.substring(2, 6).toUpperCase()}...${connectedWallet.substring(connectedWallet.length - 4).toUpperCase()}`,
          contractNumber: `42.v${Math.floor(Math.random() * 9) + 1}`,
          status: 'active' as const,
          network: 'Arbitrum Sepolia',
          gasUsed: `${(Math.random() * 0.05 + 0.02).toFixed(4)} ETH`,
          transactionHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`
        };

        try {
          const stored = localStorage.getItem('alpha_deployments');
          const deployments = stored ? JSON.parse(stored) : [];
          const updated = [newDeployment, ...deployments].slice(0, 50);
          localStorage.setItem('alpha_deployments', JSON.stringify(updated));

          // Trigger storage event for same-page listeners
          window.dispatchEvent(new Event('storage'));
        } catch (e) {
          console.error('Failed to save deployment:', e);
        }
      }
    }, 2000);
  };

  const handleWalletChange = (address: string) => {
    setConnectedWallet(address);
    // Auto-start if connecting for the first time or reconnecting
    if (address) {
      startBotActivity();
    } else {
      setIsEngineRunning(false);
      stopBotActivity();
    }
  };

  const startBotActivity = () => {
    setBots(prev => prev.map(bot => ({
      ...bot,
      status: bot.role === BotRole.SCANNER ? BotStatus.SCANNING : BotStatus.IDLE,
      lastAction: bot.role === BotRole.SCANNER ? 'Scanning mempool...' : 'Awaiting signal',
    })));
  };

  const stopBotActivity = () => {
    setBots(prev => prev.map(bot => ({
      ...bot,
      status: BotStatus.IDLE,
      lastAction: 'Standby',
      cpuUsage: 0
    })));
  };

  const runAlphaForge = useCallback(async () => {
    if (!isEngineRunning) return;
    setIsAIThinking(true);
    const alpha = await forgeEnterpriseAlpha({
      aave_liquidity: realTimeData.balance ? parseFloat(realTimeData.balance) : 0,
      active_integrations: ["1Click", "DexTools", "BitQuery", "EtherscanPro"],
      network_load: "Low",
      mempool_volatility: "0.00%"
    });
    if (alpha.strategies.length > 0) {
      setStrategies(alpha.strategies);
    }
    if (alpha.wallets && alpha.wallets.length > 0) {
      setChampions(alpha.wallets);
    }
    setIsAIThinking(false);
  }, [isEngineRunning, realTimeData.balance]);

  // Monitor wallet for real-time data
  useEffect(() => {
    if (!connectedWallet || !productionService || !isEngineRunning) return;
    let cleanup: (() => void) | undefined;
    const setupMonitoring = async () => {
      try {
        cleanup = await productionService.monitorWallet(connectedWallet, (data) => {
          const augmentedData = { ...data, strategyCount: strategies.length };
          setRealTimeData(augmentedData);
          setBots(prev => prev.map(bot => ({
            ...bot,
            cpuUsage: bot.status !== BotStatus.IDLE ? Math.min(data.txCount * 2, 95) : 0,
            status: bot.role === BotRole.SCANNER && augmentedData.pairCount > 0 ? BotStatus.SCANNING :
              bot.role === BotRole.ORCHESTRATOR && augmentedData.strategyCount > 0 ? BotStatus.FORGING :
                bot.role === BotRole.EXECUTOR && augmentedData.txCount > 0 ? BotStatus.EXECUTING : BotStatus.IDLE
          })));
        });
      } catch (error) {
        console.error('Error setting up wallet monitoring:', error);
      }
    };
    setupMonitoring();
    return () => { if (cleanup) cleanup(); };
  }, [connectedWallet, productionService, isEngineRunning]);

  // Consolidated effect for bot status updates
  useEffect(() => {
    if (!isEngineRunning) return;

    const hasChampions = champions.length > 0;
    const hasStrategies = strategies.length > 0;

    // Update bot statuses based on the latest real-time data and AI outputs
    setBots(prev => prev.map(bot => ({
      ...bot,
      status:
        bot.role === BotRole.SCANNER && realTimeData.pairCount > 0 ? BotStatus.SCANNING :
          bot.role === BotRole.ORCHESTRATOR && (hasChampions || hasStrategies) ? BotStatus.FORGING :
            bot.role === BotRole.EXECUTOR && realTimeData.txCount > 0 ? BotStatus.EXECUTING :
              BotStatus.IDLE,
      lastAction:
        bot.role === BotRole.ORCHESTRATOR && hasChampions ? `Prioritizing ${champions.length} Champion signals...` :
          bot.role === BotRole.ORCHESTRATOR && hasStrategies ? `Analyzing ${strategies.length} strategies...` :
            bot.lastAction,
    })));
  }, [realTimeData, strategies.length, champions.length, isEngineRunning]);

  // Initial Forge and Interval-based updates
  useEffect(() => {
    if (!isEngineRunning) return;

    // Initial forge on startup
    runAlphaForge();

    // Set up a 15-minute interval for AI Re-Forging (Enterprise Standard)
    const forgeInterval = setInterval(runAlphaForge, 15 * 60 * 1000);

    return () => clearInterval(forgeInterval);
  }, [runAlphaForge, isEngineRunning]);


  // New: Log real-time data for analysis whenever it changes
  useEffect(() => {
    if (!isEngineRunning) return;
    console.log('[Real-Time Data Update]', JSON.stringify(realTimeData, null, 2));
  }, [realTimeData, isEngineRunning]);

  // Effect to handle profit update animation
  useEffect(() => {
    const previousProfit = prevProfitRef.current;
    const currentProfit = realTimeData.profits;

    // Only trigger animation if profit has increased
    if (currentProfit > previousProfit) {
      const profitIncrease = currentProfit - previousProfit;

      // Log the profit drop to the console with styling
      console.log(
        `%c🚀 PROFIT DROP: +$${profitIncrease.toFixed(2)} USDC`,
        'color: #22c55e; font-size: 14px; font-weight: bold; padding: 2px 0;'
      );
      console.log(`  %cTimestamp: %c${new Date().toLocaleTimeString()}`, 'color: #94a3b8;', 'color: #e2e8f0;');
      console.log(`  %cBlock: %c#${realTimeData.blockNumber}`, 'color: #94a3b8;', 'color: #e2e8f0;');

      setIsProfitUpdated(true);
      const timer = setTimeout(() => setIsProfitUpdated(false), 1000);

      return () => clearTimeout(timer);
    }
  }, [realTimeData.profits, realTimeData.blockNumber]); // Depend on blockNumber as well

  useEffect(() => { prevProfitRef.current = realTimeData.profits; }, [realTimeData.profits]);

  const settingsButtons = [ 
    { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
  ] as const;

  const monitorButtons = [
    { id: 'core-metrics', label: 'Core Metrics', icon: <LayoutDashboard size={14} /> },
    { id: 'security-metrics', label: 'Security Metrics', icon: <ShieldCheck size={14} /> },
    { id: 'ai-optimization', label: 'AI Optimization Engine', icon: <Sparkles size={14} /> },
    { id: 'bot-fleets', label: 'Bot Fleets', icon: <Cpu size={14} /> },
    { id: 'latency-metrics', label: 'Execution Latency', icon: <Clock size={14} /> },
    { id: 'gas-metrics', label: 'Gas Optimization', icon: <Fuel size={14} /> },
    { id: 'profit-reinvestment', label: 'Profit Reinvestment', icon: <PieChart size={14} /> },
    { id: 'champion-discovery', label: 'Champion Discovery', icon: <Target size={14} /> },
    { id: 'deployment-registry', label: 'Deployment Registry', icon: <Database size={14} /> },
    { id: 'profit-withdrawal', label: 'Profit Withdrawal', icon: <Wallet size={14} /> },
    { id: 'flash-loan-providers', label: 'Flash Loan Providers', icon: <Zap size={14} /> },
    { id: 'blockchain-streaming', label: 'Blockchain Event Streaming', icon: <Activity size={14} /> },
    { id: 'treasury-balance', label: 'Treasury Balance', icon: <Wallet size={14} /> },
  ] as const;

  const optimizeButtons = [
    { id: 'ai-optimization', label: 'AI Optimization Engine', icon: <Sparkles size={14} /> },
    { id: 'bot-fleets', label: 'Bot Fleets', icon: <Cpu size={14} /> },
    { id: 'champion-discovery', label: 'Champion Discovery', icon: <Target size={14} /> },
    { id: 'ai-terminal', label: 'Alpha-Orion AI Terminal', icon: <Terminal size={14} /> },
  ] as const;

  const commandButtons = [
    { id: 'connect-wallet', label: 'Connect Wallet', icon: <Wallet size={14} /> },
    { id: 'deploy-engine', label: 'Deploy Engine', icon: <Rocket size={14} /> },
    { id: 'strategy-control', label: 'Strategy Control', icon: <Sliders size={14} /> },
  ] as const;

  const allNavButtons = [...settingsButtons, ...monitorButtons, ...optimizeButtons, ...commandButtons];

  return (
    <ErrorBoundary>
      <HashRouter>
        <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-200 font-sans">
          {/* Sidebar */}
          <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} glass-panel border-r border-slate-800 flex flex-col overflow-hidden transition-all duration-300`}>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-6">
                <div className="flex items-center gap-3 text-indigo-500 mb-10 px-2">
                  <Sparkles className="fill-current text-indigo-400 shadow-indigo-500/20" size={20} />
                  <h1 className="text-lg font-black tracking-tight text-white uppercase italic">ARBINEXUS</h1>
                </div>

                {/* Metrics Navigation */}
                <div className="space-y-6">
                  
                  {/* 1. Settings */}
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4 mb-3">1. Settings</p>
                    <nav className="space-y-1">
                      {settingsButtons.map((btn) => (
                        <MetricButton
                          key={btn.id}
                          icon={btn.icon}
                          label={btn.label}
                          isActive={activeView === btn.id}
                          onClick={() => setActiveView(btn.id as MetricView)}
                        />
                      ))}
                    </nav>
                  </div>

                  {/* Wallet & Engine Controls */}
                  {/* 2. Monitor */}
                  <div className="pt-6 border-t border-slate-900">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4 mb-3">2. Monitor</p>
                    <nav className="space-y-1">
                      {monitorButtons.map((btn) => (
                        <MetricButton
                          key={btn.id}
                          icon={btn.icon}
                          label={btn.label}
                          isActive={activeView === btn.id}
                          onClick={() => setActiveView(btn.id as MetricView)}
                        />
                      ))}
                    </nav>
                  </div>

                  {/* 3. Optimize */}
                  <div className="pt-6 border-t border-slate-900">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4 mb-3">3. Optimize</p>
                    <nav className="space-y-1">
                      {optimizeButtons.map((btn) => (
                        <MetricButton
                          key={btn.id}
                          icon={btn.icon}
                          label={btn.label}
                          isActive={activeView === btn.id}
                          onClick={() => setActiveView(btn.id as MetricView)}
                        />
                      ))}
                    </nav>
                  </div>

                  {/* 4. Command Post */}
                  <div className="pt-6 border-t border-slate-900">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4 mb-3">4. Command Post</p>
                    <nav className="space-y-1">
                      {commandButtons.map((btn) => (
                        <MetricButton
                          key={btn.id}
                          icon={btn.icon}
                          label={btn.label}
                          isActive={activeView === btn.id}
                          onClick={() => setActiveView(btn.id as MetricView)}
                        />
                      ))}
                    </nav>
                  </div>

                  {/* Live Stats */}
                  {isEngineRunning && (
                    <div className="pt-6 border-t border-slate-900">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-4 mb-3">Live Blockchain Data</p>
                      <div className="px-4 space-y-2">
                        <div className="flex justify-between text-[8px]">
                          <span className="text-slate-500 font-bold uppercase">Block</span>
                          <span className="text-emerald-400 font-mono">#{realTimeData.blockNumber}</span>
                        </div>
                        <div className="flex justify-between text-[8px]">
                          <span className="text-slate-500 font-bold uppercase">Gas</span>
                          <span className="text-amber-400 font-mono">{parseFloat(realTimeData.gasPrice).toFixed(2)} Gwei</span>
                        </div>
                        <div className="flex justify-between text-[8px]">
                          <span className="text-slate-500 font-bold uppercase">Pairs</span>
                          <span className="text-indigo-400 font-mono">{realTimeData.pairCount}</span>
                        </div>
                        <div className="flex justify-between text-[8px]">
                          <span className="text-slate-500 font-bold uppercase">Validated TX</span>
                          <span className="text-cyan-400 font-mono">{realTimeData.validatedTransactions}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-900 bg-black/20">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full animate-pulse ${isEngineRunning ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                <div className="flex-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] block">
                    {isEngineRunning ? 'Engine Running' : 'Cluster Online'}
                  </span>
                  {connectedWallet && (
                    <span className="text-[7px] font-bold text-slate-600 uppercase block mt-1">
                      {connectedWallet.substring(0, 6)}...{connectedWallet.substring(connectedWallet.length - 4)}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[8px] font-bold text-slate-600 uppercase mt-2">Enterprise Logic v4.2</p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-950/50">
            {/* Header */}
            <header className="h-14 glass-panel border-b border-slate-900 flex items-center justify-between px-8">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  {isSidebarOpen ? <X size={18} className="text-slate-400" /> : <Menu size={18} className="text-slate-400" />}
                </button>
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                  {metricButtons.find(b => b.id === activeView)?.label || 'System Command Hub'}
                  {allNavButtons.find(b => b.id === activeView)?.label || 'System Command Hub'}
                </h2>
              </div>
              <div className="flex items-center gap-6">
                {isAIThinking && <span className="text-[8px] text-indigo-400 font-black animate-pulse uppercase tracking-[0.2em]">AI Syncing Discovery...</span>}
                <div className={`relative w-2 h-2 rounded-full bg-emerald-500 transition-opacity duration-300 ${isProfitUpdated ? 'opacity-100' : 'opacity-0'}`}>
                  {isProfitUpdated && (
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-600 uppercase font-black">Validated Profit</span>
                  <p className="text-emerald-400 font-black text-xs leading-none">${realTimeData.profits.toFixed(2)} USDC</p>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              {(() => {
                switch (activeView) {
                  case 'connect-wallet':
                    return <div className="max-w-2xl mx-auto"><WalletManager onWalletChange={handleWalletChange} /></div>;
                  case 'deploy-engine':
                    return (
                      <div className="max-w-2xl mx-auto glass-panel p-8 rounded-2xl border border-white/5">
                        <div className="text-center space-y-4">
                          <Rocket size={48} className="mx-auto text-indigo-400" />
                          <h3 className="text-xl font-black text-white uppercase">
                            {isEngineRunning ? 'Engine Cluster Active' : connectedWallet ? 'Finalize Deployment' : 'Deploy Engine'}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {isEngineRunning
                              ? 'Institutional execution layer is now live and monitoring.'
                              : connectedWallet
                                ? 'Configure the smart execution node for your manager wallet.'
                                : 'Connect your wallet to deploy the arbitrage engine'}
                          </p>
                          {!connectedWallet && (
                            <button
                              onClick={() => setActiveView('connect-wallet')}
                              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold uppercase tracking-wider transition-colors"
                            >
                              Connect Wallet First
                            </button>
                          )}
                          {connectedWallet && !isEngineRunning && (
                            <div className="space-y-4">
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">
                                Your Manager (Metamask) is connected. Initializing the engine will automatically generate your
                                <span className="text-indigo-400 font-black"> Smart Execution Node </span>
                                for gasless arbitrage.
                              </p>
                              <button
                                onClick={() => setShowDeployModal(true)}
                                className="w-full px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-500/20"
                              >
                                Initialize & Forge Smart Account
                              </button>
                            </div>
                          )}

                          {/* Confirmation Modal */}
                          {showDeployModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                                <div className="flex items-center gap-3 mb-4 text-amber-400">
                                  <AlertTriangle size={24} />
                                  <h3 className="text-lg font-bold text-white">Confirm Deployment</h3>
                                </div>
                                
                                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                                  You are about to initialize the <span className="font-bold text-white">Alpha-Orion Arbitrage Engine</span>. 
                                  This action will forge a Smart Account on the network and begin real-time execution monitoring.
                                </p>

                                <div className="flex gap-3">
                                  <button
                                    onClick={() => setShowDeployModal(false)}
                                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={handleEngineStart}
                                    disabled={isLaunching}
                                    className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                  >
                                    {isLaunching ? (
                                      <>
                                        <Loader className="animate-spin" size={18} />
                                        <span>Launching...</span>
                                      </>
                                    ) : (
                                      <span>Confirm Launch</span>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {isEngineRunning && (
                            <div className="space-y-4">
                              <div className="flex items-center justify-center gap-2 text-emerald-400">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="font-bold uppercase">Engine Running</span>
                              </div>
                              <div className="p-4 bg-slate-900/50 border border-emerald-500/20 rounded-xl">
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Generated Execution Node</p>
                                <p className="text-xs font-mono text-emerald-400">0x748A...{connectedWallet?.substring(connectedWallet.length - 4) || '2751'}</p>
                                <p className="text-[8px] text-slate-600 mt-2">The system has automatically generated this Smart Account for high-frequency execution. No manual input required.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  case 'ai-terminal':
                    return <div className="h-full"><AITerminal realTimeData={realTimeData} /></div>;
                  case 'strategy-control':
                    return (
                      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-2">Active Strategy Control</h2>
                          <p className="text-slate-400">Real-time modulation of active trading strategies.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {['Spot Arbitrage', 'Gamma Scalping', 'Perp Hedging', 'Batch Auctions'].map((strategy) => (
                            <div key={strategy} className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
                              <span className="font-bold text-slate-200">{strategy}</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked={strategy !== 'Batch Auctions'} />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                              </label>
                            </div>
                          ))}
                        </div>

                        <div className="pt-8 border-t border-slate-800">
                          <button 
                            onClick={() => alert('EMERGENCY STOP TRIGGERED: All bots halting...')}
                            className="w-full py-4 bg-red-500/10 border border-red-500/50 hover:bg-red-500 hover:text-white text-red-500 rounded-xl font-black uppercase tracking-widest transition-all"
                          >
                            🛑 Emergency Kill Switch
                          </button>
                        </div>
                      </div>
                    );
                  case 'security-metrics':
                    return (
                      <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-2">Security & Risk Analytics</h2>
                          <p className="text-slate-400">Real-time portfolio correlation matrix and risk exposure analysis.</p>
                        </div>
                        
                        {/* Transferred Risk Metrics from Legacy Dashboard */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { label: 'VaR (95%)', val: '$450.20', color: 'text-slate-200' },
                            { label: 'Sortino Ratio', val: '3.2', color: 'text-emerald-400' },
                            { label: 'Portfolio Delta', val: '0.02', color: 'text-blue-400' },
                            { label: 'Gamma Exposure', val: '0.15', color: 'text-purple-400' },
                          ].map((m) => (
                            <div key={m.label} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
                              <div className="text-xs text-slate-500 uppercase font-bold mb-1">{m.label}</div>
                              <div className={`text-xl font-mono font-bold ${m.color}`}>{m.val}</div>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <RiskHeatmap />
                        </div>
                      </div>
                    );
                  case 'treasury-balance':
                    return <div className="max-w-2xl mx-auto"><TreasuryPage /></div>;
                  case 'settings':
                    return <div className="max-w-4xl mx-auto"><SettingsComponent volume={soundVolume} onVolumeChange={setSoundVolume} /></div>;
                  default:
                    return <Dashboard
                      wallet={wallet}
                      bots={bots}
                      strategies={strategies}
                      champions={champions}
                      aiInsight=""
                      realTimeData={realTimeData}
                      activeView={activeView}
                    />;
                }
              })()}
            </div>

            {/* Success Toast Notification */}
            {showToast && (
              <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
                <div className="bg-slate-900/90 border border-emerald-500/30 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-500/10 flex items-center gap-4">
                  <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-emerald-400">System Online</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{toastMessage}</p>
                  </div>
                  <button onClick={() => setShowToast(false)} className="ml-2 text-slate-500 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </HashRouter>
    </ErrorBoundary>
  );
};

const MetricButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${isActive
      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/10'
      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'
      }`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-[11px] font-bold">{label}</span>
    </div>
  </button>
);

export default App;
