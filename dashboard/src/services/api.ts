import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  ProfitData,
  Opportunity,
  Trade,
  SystemHealth,
  PimlicoStatus,
  AnalyticsData,
  ApexBenchmarkData,
  BenchmarkHistory,
  ApiResponse,
  ApiError
} from '../types/api';

class AlphaOrionAPI {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = '') {
    // Use environment variable or fallback to Cloud Run URL or localhost
    // In production, set REACT_APP_API_URL to the Cloud Run service URL
    const envAPIUrl = typeof process !== 'undefined' ? process.env.REACT_APP_API_URL : '';
    const cloudRunURL = 'https://alpha-orion-core-380955632798.us-central1.run.app';
    const localhostURL = 'http://localhost:8080';
    
    this.baseURL = baseURL || envAPIUrl || cloudRunURL || localhostURL;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 404) {
          console.warn('API endpoint not found, system may not be running');
        }
        return Promise.reject(error);
      }
    );
  }

  // Profit Data Endpoints
  async getProfitData(): Promise<ProfitData | null> {
    try {
      const response: AxiosResponse<ApiResponse<ProfitData>> = await this.client.get('/analytics/total-pnl');
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('Failed to fetch profit data:', error);
      return null;
    }
  }

  // Opportunities Endpoints
  async getOpportunities(): Promise<Opportunity[]> {
    try {
      const response: AxiosResponse<ApiResponse<Opportunity[]>> = await this.client.get('/opportunities');
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
      return [];
    }
  }

  async executeOpportunity(opportunityId: string): Promise<boolean> {
    try {
      const response: AxiosResponse<ApiResponse<{ success: boolean }>> =
        await this.client.post(`/opportunities/${opportunityId}/execute`);
      return response.data.success && response.data.data.success;
    } catch (error) {
      console.error('Failed to execute opportunity:', error);
      return false;
    }
  }

  // Trade History Endpoints
  async getTradeHistory(limit: number = 50): Promise<Trade[]> {
    try {
      const response: AxiosResponse<ApiResponse<Trade[]>> =
        await this.client.get(`/trades?limit=${limit}`);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Failed to fetch trade history:', error);
      return [];
    }
  }

  // System Health Endpoints
  async getSystemHealth(): Promise<SystemHealth | null> {
    try {
      const response: AxiosResponse<ApiResponse<SystemHealth>> = await this.client.get('/mode/current');
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      return null;
    }
  }

  // Pimlico Status Endpoints
  async getPimlicoStatus(): Promise<PimlicoStatus | null> {
    try {
      const response: AxiosResponse<ApiResponse<PimlicoStatus>> = await this.client.get('/pimlico/status');
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('Failed to fetch Pimlico status:', error);
      return null;
    }
  }

  // Analytics Endpoints
  async getAnalytics(): Promise<AnalyticsData | null> {
    try {
      const response: AxiosResponse<ApiResponse<AnalyticsData>> = await this.client.get('/analytics');
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      return null;
    }
  }

  // System Control Endpoints
  async setSystemMode(mode: 'PRODUCTION' | 'TESTING' | 'MAINTENANCE'): Promise<boolean> {
    try {
      const response: AxiosResponse<ApiResponse<{ success: boolean }>> =
        await this.client.post('/mode', { mode });
      return response.data.success && response.data.data.success;
    } catch (error) {
      console.error('Failed to set system mode:', error);
      return false;
    }
  }

  async togglePimlicoMode(enabled: boolean): Promise<boolean> {
    try {
      const response: AxiosResponse<ApiResponse<{ success: boolean }>> =
        await this.client.post('/pimlico/toggle', { enabled });
      return response.data.success && response.data.data.success;
    } catch (error) {
      console.error('Failed to toggle Pimlico mode:', error);
      return false;
    }
  }

  // Apex Benchmarking Endpoints
  async getBenchmarkStatus(): Promise<ApexBenchmarkData | null> {
    try {
      const response: AxiosResponse<ApiResponse<ApexBenchmarkData>> = await this.client.get('/benchmarking/status');
      return response.data.success ? response.data.data : null;
    } catch (error) {
      console.error('Failed to fetch benchmark status:', error);
      return null;
    }
  }

  async getBenchmarkHistory(limit: number = 100): Promise<BenchmarkHistory[]> {
    try {
      const response: AxiosResponse<ApiResponse<BenchmarkHistory[]>> =
        await this.client.get(`/benchmarking/history?limit=${limit}`);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error('Failed to fetch benchmark history:', error);
      return [];
    }
  }

  async recordBenchmarkMetric(metric: string, value: number): Promise<boolean> {
    try {
      const response: AxiosResponse<ApiResponse<{ success: boolean }>> =
        await this.client.post('/benchmarking/record', { metric, value });
      return response.data.success && response.data.data.success;
    } catch (error) {
      console.error('Failed to record benchmark metric:', error);
      return false;
    }
  }

  // Monitoring Endpoints
  async getMonitoringData(metric: string, timeframe: string = '1h'): Promise<any[]> {
    try {
      const response: AxiosResponse<ApiResponse<any[]>> =
        await this.client.get(`/monitoring/${metric}?timeframe=${timeframe}`);
      return response.data.success ? response.data.data : [];
    } catch (error) {
      console.error(`Failed to fetch monitoring data for ${metric}:`, error);
      return [];
    }
  }

  async getSystemMetrics(): Promise<any> {
    try {
      const response: AxiosResponse<ApiResponse<any>> = await this.client.get('/monitoring/system');
      return response.data.success ? response.data.data : {};
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      return {};
    }
  }

  // Health Check
  async healthCheck(): Promise<boolean> {
    try {
      const response: AxiosResponse<ApiResponse<{ status: string }>> = await this.client.get('/health');
      return response.data.success && response.data.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  // Update base URL (for different environments)
  setBaseURL(url: string): void {
    this.baseURL = url;
    this.client.defaults.baseURL = url;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

// Create singleton instance
export const alphaOrionAPI = new AlphaOrionAPI();

// Export class for testing or multiple instances
export default AlphaOrionAPI;
