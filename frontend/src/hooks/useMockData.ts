
import { useState, useEffect } from 'react';
import { Microservice, Opportunity, Strategy, PnlChartData } from '../types';

const API_BASE = 'http://localhost:8080'; // Adjust for production

export const useApiData = () => {
  const [services, setServices] = useState<Microservice[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [pnlData, setPnlData] = useState<PnlChartData[]>([]);
  const [totalPnl, setTotalPnl] = useState<number>(0);
  const [totalTrades, setTotalTrades] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, opportunitiesRes, strategiesRes, pnlRes, totalRes] = await Promise.all([
          fetch(`${API_BASE}/services`),
          fetch(`${API_BASE}/opportunities`),
          fetch(`${API_BASE}/strategies`),
          fetch(`${API_BASE}/analytics/pnl`),
          fetch(`${API_BASE}/analytics/total-pnl`)
        ]);

        setServices(await servicesRes.json());
        setOpportunities(await opportunitiesRes.json());
        setStrategies(await strategiesRes.json());
        setPnlData(await pnlRes.json());
        const total = await totalRes.json();
        setTotalPnl(total.totalPnl);
        setTotalTrades(total.totalTrades);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();

    // Poll for updates
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return { services, opportunities, strategies, pnlData, totalPnl, totalTrades };
};
