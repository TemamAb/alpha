const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const controlApi = {
  setCapitalVelocity: async (value: number) => {
    const response = await fetch(`${API_BASE_URL}/controls/velocity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value }),
    });
    if (!response.ok) {
      throw new Error(`Error setting capital velocity: ${response.statusText}`);
    }
    return response.json();
  },

  setReinvestmentRate: async (value: number) => {
    const response = await fetch(`${API_BASE_URL}/controls/reinvest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value }),
    });
    if (!response.ok) {
      throw new Error(`Error setting reinvestment rate: ${response.statusText}`);
    }
    return response.json();
  },

  toggleStrategy: async (strategyId: string, active: boolean) => {
    const response = await fetch(`${API_BASE_URL}/strategies/${strategyId}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ active }),
    });
    if (!response.ok) {
      throw new Error(`Error toggling strategy ${strategyId}: ${response.statusText}`);
    }
    return true;
  },

  emergencyStop: async () => {
    const response = await fetch(`${API_BASE_URL}/system/emergency-stop`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Error triggering emergency stop: ${response.statusText}`);
    }
    return true;
  },

  saveMatrixConfiguration: async (config: any) => {
    const response = await fetch(`${API_BASE_URL}/matrix/configuration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      throw new Error(`Error saving matrix configuration: ${response.statusText}`);
    }
    return response.json();
  },
};