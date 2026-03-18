import { useState, useEffect } from 'react';

export interface Service {
  id: string;
  name: string;
  region: string;
  status: string;
  cpuUsage: number;
  memoryUsage: number;
  lastLog: string;
}

export interface Opportunity {
  id: string;
  assets: string[];
  exchanges: string[];
  potentialProfit: number;
  riskLevel: string;
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

export interface PnlData {
  time: string;
  pnl: number;
}

export interface Analytics {
  totalPnl: number;
  totalTrades: number;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const useApiData = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [pnlData, setPnlData] = useState<PnlData[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({ totalPnl: 0, totalTrades: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [servicesRes, opportunitiesRes, strategiesRes, pnlRes, analyticsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/services`),
          fetch(`http://localhost:8082/opportunities`), // Updated to use eye-scanner service
          fetch(`${API_BASE_URL}/strategies`),
          fetch(`${API_BASE_URL}/analytics/pnl`),
          fetch(`${API_BASE_URL}/analytics/total-pnl`),
        ]);

        if (!servicesRes.ok || !opportunitiesRes.ok || !strategiesRes.ok || !pnlRes.ok || !analyticsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const [servicesData, opportunitiesData, strategiesData, pnlData, analyticsData] = await Promise.all([
          servicesRes.json(),
          opportunitiesRes.json(),
          strategiesRes.json(),
          pnlRes.json(),
          analyticsRes.json(),
        ]);

        setServices(servicesData);
        setOpportunities(opportunitiesData);
        setStrategies(strategiesData);
        setPnlData(pnlData);
        setAnalytics(analyticsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return {
    services,
    opportunities,
    strategies,
    pnlData,
    analytics,
    loading,
    error,
    refetch: () => {
      setLoading(true);
      // Trigger refetch by updating a dependency or using a refetch function
    },
  };
};
