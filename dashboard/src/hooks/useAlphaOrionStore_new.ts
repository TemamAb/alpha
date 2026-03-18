import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  ProfitData,
  Opportunity,
  Trade,
  SystemHealth,
  PimlicoStatus,
  AnalyticsData
} from '../types/api';

export interface WalletData {
  id: number;
  address: string;
  accountName: string;
  logo: string;
  status: 'valid' | 'invalid';
  balance: number;
}

interface AlphaOrionState {
  // Data states
  profitData: ProfitData | null;
  opportunities: Opportunity[];
  tradeHistory: Trade[];
  systemHealth: SystemHealth | null;
  pimlicoStatus: PimlicoStatus | null;
  analytics: AnalyticsData | null;
  wallets: WalletData[];

  // UI states
  isLoading: {
    profit: boolean;
    opportunities: boolean;
    trades: boolean;
    health: boolean;
    pimlico: boolean;
    analytics: boolean;
  };
  error: string | null;
  lastUpdate: Date | null;
  refreshInterval: number;
  currency: 'ETH' | 'USD';

  // Strategy settings
  reinvestmentRate: number; // 0-100%
  capitalVelocity: number; // $1M to $500M
  settingsLocked: {
    reinvestmentRate: boolean;
    capitalVelocity: boolean;
  };

  // Actions
  setProfitData: (data: ProfitData | null) => void;
  setOpportunities: (data: Opportunity[]) => void;
  setTradeHistory: (data: Trade[]) => void;
  setSystemHealth: (data: SystemHealth | null) => void;
  setPimlicoStatus: (data: PimlicoStatus | null) => void;
  setAnalytics: (data: AnalyticsData | null) => void;
  setWallets: (wallets: WalletData[]) => void;
  addWallet: (wallet: WalletData) => void;
  removeWallet: (id: number) => void;
  updateWallet: (id: number, updates: Partial<WalletData>) => void;

  setLoading: (key: keyof AlphaOrionState['isLoading'], loading: boolean) => void;
  setError: (error: string | null) => void;
  updateLastUpdate: () => void;
  setRefreshInterval: (interval: number) => void;
  setCurrency: (currency: 'ETH' | 'USD') => void;

  // Strategy settings actions
  setReinvestmentRate: (rate: number) => void;
  setCapitalVelocity: (velocity: number) => void;
  toggleSettingLock: (setting: keyof AlphaOrionState['settingsLocked']) => void;

  // Computed values
  getTotalProfit: () => number;
  getActiveOpportunities: () => Opportunity[];
  getRecentTrades: (limit?: number) => Trade[];
  getSystemStatus: () => 'healthy' | 'warning' | 'critical' | 'unknown';
}

export const useAlphaOrionStore = create<AlphaOrionState>()(
  subscribeWithSelector((set, get) => ({
    // Initial states
    profitData: null,
    opportunities: [],
    tradeHistory: [],
    systemHealth: null,
    pimlicoStatus: null,
    analytics: null,
    wallets: [
      { id: 1, address: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E679', accountName: 'Main Treasury', logo: 'MetaMask', status: 'valid', balance: 125.45 },
      { id: 2, address: '0x8BA1f109551bD432803012645Ac136ddd64DBA72', accountName: 'Arbitrage Bot A', logo: 'WalletConnect', status: 'valid', balance: 89.32 },
      { id: 3, address: '0xdD2FD4581271e230360230F9337D5c0430Bf44C0', accountName: 'Hot Wallet', logo: 'MetaMask', status: 'invalid', balance: 0 },
      { id: 4, address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', accountName: 'Cold Storage', logo: 'Ledger', status: 'valid', balance: 2540.67 },
      { id: 5, address: '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E', accountName: 'LP Provider', logo: 'TrustWallet', status: 'valid', balance: 567.89 },
    ],

    isLoading: {
      profit: false,
      opportunities: false,
      trades: false,
      health: false,
      pimlico: false,
      analytics: false,
    },

    error: null,
    lastUpdate: null,
    refreshInterval: 5,
    currency: 'USD',

    // Strategy settings initial values
    reinvestmentRate: 75, // 75%
    capitalVelocity: 10000000, // $10M
    settingsLocked: {
      reinvestmentRate: true,
      capitalVelocity: true,
    },

    // Actions
    setProfitData: (data) => set({ profitData: data }),
    setOpportunities: (data) => set({ opportunities: data }),
    setTradeHistory: (data) => set({ tradeHistory: data }),
    setSystemHealth: (data) => set({ systemHealth: data }),
    setPimlicoStatus: (data) => set({ pimlicoStatus: data }),
    setAnalytics: (data) => set({ analytics: data }),
    setWallets: (wallets) => set({ wallets }),
    addWallet: (wallet) => set((state) => ({ wallets: [...state.wallets, wallet] })),
    removeWallet: (id) => set((state) => ({ wallets: state.wallets.filter((w) => w.id !== id) })),
    updateWallet: (id, updates) => set((state) => ({
      wallets: state.wallets.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    })),

    setLoading: (key, loading) =>
      set((state) => ({
        isLoading: { ...state.isLoading, [key]: loading }
      })),

    setError: (error) => set({ error }),
    updateLastUpdate: () => set({ lastUpdate: new Date() }),
    setRefreshInterval: (interval) => set({ refreshInterval: Math.max(1, Math.min(30, interval)) }),
    setCurrency: (currency) => set({ currency }),

    // Strategy settings actions
    setReinvestmentRate: (rate) => set({ reinvestmentRate: Math.max(0, Math.min(100, rate)) }),
    setCapitalVelocity: (velocity) => set({ capitalVelocity: Math.max(1000000, Math.min(500000000, velocity)) }),
    toggleSettingLock: (setting) => set((state) => ({
      settingsLocked: {
        ...state.settingsLocked,
        [setting]: !state.settingsLocked[setting]
      }
    })),

    // Computed values
    getTotalProfit: () => {
      const { profitData } = get();
      return profitData?.totalPnL || 0;
    },

    getActiveOpportunities: () => {
      const { opportunities } = get();
      return opportunities.filter(opp => opp.status === 'pending');
    },

    getRecentTrades: (limit = 10) => {
      const { tradeHistory } = get();
      return tradeHistory.slice(0, limit);
    },

    getSystemStatus: () => {
      const { systemHealth } = get();
      if (!systemHealth) return 'unknown';
      if (systemHealth.status === 'critical') return 'critical';
      if (systemHealth.status === 'warning') return 'warning';
      return 'healthy';
    },
  }))
);

// Selectors for optimized re-renders
export const useProfitData = () => useAlphaOrionStore((state) => state.profitData);
export const useOpportunities = () => useAlphaOrionStore((state) => state.opportunities);
export const useTradeHistory = () => useAlphaOrionStore((state) => state.tradeHistory);
export const useSystemHealth = () => useAlphaOrionStore((state) => state.systemHealth);
export const usePimlicoStatus = () => useAlphaOrionStore((state) => state.pimlicoStatus);
export const useAnalytics = () => useAlphaOrionStore((state) => state.analytics);
export const useLoading = () => useAlphaOrionStore((state) => state.isLoading);
export const useError = () => useAlphaOrionStore((state) => state.error);
export const useLastUpdate = () => useAlphaOrionStore((state) => state.lastUpdate);
export const useRefreshInterval = () => useAlphaOrionStore((state) => state.refreshInterval);
export const useCurrency = () => useAlphaOrionStore((state) => state.currency);
export const useWallets = () => useAlphaOrionStore((state) => state.wallets);

// Strategy settings selectors
export const useReinvestmentRate = () => useAlphaOrionStore((state) => state.reinvestmentRate);
export const useCapitalVelocity = () => useAlphaOrionStore((state) => state.capitalVelocity);
export const useSettingsLocked = () => useAlphaOrionStore((state) => state.settingsLocked);

// Computed selectors
export const useTotalProfit = () => useAlphaOrionStore((state) => state.getTotalProfit());
export const useActiveOpportunities = () => useAlphaOrionStore((state) => state.getActiveOpportunities());
export const useRecentTrades = (limit?: number) => useAlphaOrionStore((state) => state.getRecentTrades(limit));
export const useSystemStatus = () => useAlphaOrionStore((state) => state.getSystemStatus());
