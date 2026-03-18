
export type ServiceStatus = 'online' | 'degraded' | 'offline';

export interface Microservice {
  id: string;
  name: string;
  region: 'us-central1' | 'europe-west1';
  status: ServiceStatus;
  cpuUsage: number;
  memoryUsage: number;
  lastLog: string;
}

export interface Opportunity {
  id:string;
  assets: [string, string];
  exchanges: [string, string];
  potentialProfit: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  timestamp: number;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  pnl: number;
  winRate: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface PnlChartData {
  time: string;
  pnl: number;
}

export interface TerminalLine {
  type: 'input' | 'output' | 'error';
  content: string;
  timestamp: string;
}
