// Alpha-Orion API Types

export interface ProfitData {
  totalPnL: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  winRate: number;
  averageProfit: number;
  largestWin: number;
  largestLoss: number;
  currentBalance: number;
  gasSavings: number;
}

export interface Opportunity {
  id: string;
  chain: string;
  tokenPair: string;
  spread: number;
  profitPotential: number;
  gasCost: number;
  estimatedProfit: number;
  riskLevel: 'low' | 'medium' | 'high';
  timestamp: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface Trade {
  id: string;
  timestamp: string;
  chain: string;
  tokenPair: string;
  amount: number;
  profit: number;
  gasUsed: number;
  status: 'success' | 'failed';
  txHash: string;
  executionTime: number;
}

export interface SystemHealth {
  mode: 'PRODUCTION' | 'TESTING' | 'MAINTENANCE';
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  lastUpdate: string;
  activeConnections: number;
  pendingTrades: number;
  errorRate: number;
}

export interface PimlicoStatus {
  enabled: boolean;
  totalGasSavings: number;
  transactionsProcessed: number;
  averageGasReduction: number;
  status: 'active' | 'inactive' | 'error';
}

export interface AnalyticsData {
  profitOverTime: Array<{ timestamp: string; value: number }>;
  tradesByChain: Array<{ chain: string; count: number; profit: number }>;
  performanceMetrics: {
    sharpeRatio: number;
    maxDrawdown: number;
    volatility: number;
    alpha: number;
  };
  riskMetrics: {
    valueAtRisk: number;
    expectedShortfall: number;
    beta: number;
  };
}

export interface ApexBenchmarkData {
  latency: {
    competitor: string;
    target_ms: number;
    current_ms: number;
    status: 'PASS' | 'FAIL';
  };
  mev_protection: {
    competitor: string;
    target_rate: number;
    current_rate: number;
    status: 'PASS' | 'FAIL';
  };
  liquidity_depth: {
    competitor: string;
    target_count: number;
    current_count: number;
    status: 'PASS' | 'FAIL';
  };
}

export interface BenchmarkHistory {
  timestamp: string;
  metric: string;
  value: number;
  status: 'PASS' | 'FAIL';
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  timestamp: string;
}
