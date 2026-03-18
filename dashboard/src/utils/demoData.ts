export const generateDemoProfit = () => ({
  totalPnL: 847250.42 + Math.random() * 5000,
  dailyPnL: 12450.75 + Math.random() * 500,
  weeklyPnL: 89250.50,
  monthlyPnL: 342750.25,
  totalTrades: 1247,
  successfulTrades: 1056,
  failedTrades: 191,
  winRate: 0.847,
  averageProfit: 679.50,
  largestWin: 12500,
  largestLoss: -3200,
  currentBalance: 1247500,
  gasSavings: 45670
});

export const generateDemoOpportunities = () => [
  { id: '1', chain: 'Ethereum', tokenPair: 'ETH/USDC', spread: 0.0245, profitPotential: 8500, gasCost: 45, estimatedProfit: 4250, riskLevel: 'low' as const, timestamp: new Date().toISOString(), status: 'pending' as const },
  { id: '2', chain: 'Arbitrum', tokenPair: 'ARB/USDC', spread: 0.0182, profitPotential: 5200, gasCost: 35, estimatedProfit: 2890, riskLevel: 'medium' as const, timestamp: new Date().toISOString(), status: 'pending' as const },
  { id: '3', chain: 'Optimism', tokenPair: 'OP/ETH', spread: 0.0312, profitPotential: 9200, gasCost: 55, estimatedProfit: 5670, riskLevel: 'low' as const, timestamp: new Date().toISOString(), status: 'executing' as const },
  { id: '4', chain: 'Polygon', tokenPair: 'MATIC/USDC', spread: 0.0156, profitPotential: 2800, gasCost: 25, estimatedProfit: 1230, riskLevel: 'medium' as const, timestamp: new Date().toISOString(), status: 'completed' as const },
  { id: '5', chain: 'Ethereum', tokenPair: 'WBTC/ETH', spread: 0.0089, profitPotential: 12500, gasCost: 85, estimatedProfit: 8900, riskLevel: 'low' as const, timestamp: new Date().toISOString(), status: 'pending' as const }
];

export const generateDemoHealth = () => ({
  mode: 'PRODUCTION' as const,
  status: 'healthy' as const,
  uptime: 86400 + Math.floor(Math.random() * 1000),
  lastUpdate: new Date().toISOString(),
  activeConnections: 42 + Math.floor(Math.random() * 5),
  pendingTrades: 5,
  errorRate: 0.001
});

export const generateDemoPimlico = () => ({
  enabled: true,
  status: 'active' as const,
  totalGasSavings: 12450 + Math.floor(Math.random() * 100),
  transactionsProcessed: 847 + Math.floor(Math.random() * 10),
  averageGasReduction: 23.5
});