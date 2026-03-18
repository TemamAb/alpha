import React, { useState, useEffect } from 'react';
import Card from '../components/ui/Card';

interface UserSettings {
  user_id: string;
  reinvestment_rate: number;
  refresh_interval_seconds: number;
  withdrawal_mode: 'auto' | 'manual';
  auto_withdrawal_threshold: number;
  manual_withdrawal_amount: number;
  profit_withdrawal_address: string | null;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/settings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updatedSettings: Partial<UserSettings>) => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ ...settings, ...updatedSettings }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const data = await response.json();
      setSettings(data);
      setSuccess(true);
      setError(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-white">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-red-500">Failed to load settings</div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">User Settings</h1>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900 border border-green-700 text-green-100 px-4 py-3 rounded">
          Settings updated successfully!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reinvestment Settings */}
        <Card title="Reinvestment Settings">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reinvestment Rate (%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.reinvestment_rate}
                onChange={(e) => setSettings({ ...settings, reinvestment_rate: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-center text-white mt-2">{settings.reinvestment_rate}%</div>
            </div>
          </div>
        </Card>

        {/* Data Refresh Settings */}
        <Card title="Data Refresh Settings">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Refresh Interval (seconds)
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={settings.refresh_interval_seconds}
                onChange={(e) => setSettings({ ...settings, refresh_interval_seconds: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="text-center text-white mt-2">{settings.refresh_interval_seconds} seconds</div>
            </div>
          </div>
        </Card>

        {/* Withdrawal Settings */}
        <Card title="Withdrawal Settings">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Withdrawal Mode
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="withdrawalMode"
                    value="auto"
                    checked={settings.withdrawal_mode === 'auto'}
                    onChange={(e) => setSettings({ ...settings, withdrawal_mode: e.target.value as 'auto' | 'manual' })}
                    className="mr-2"
                  />
                  <span className="text-white">Auto</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="withdrawalMode"
                    value="manual"
                    checked={settings.withdrawal_mode === 'manual'}
                    onChange={(e) => setSettings({ ...settings, withdrawal_mode: e.target.value as 'auto' | 'manual' })}
                    className="mr-2"
                  />
                  <span className="text-white">Manual</span>
                </label>
              </div>
            </div>

            {settings.withdrawal_mode === 'auto' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Auto Withdrawal Threshold ($)
                </label>
                <input
                  type="number"
                  value={settings.auto_withdrawal_threshold}
                  onChange={(e) => setSettings({ ...settings, auto_withdrawal_threshold: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  min="0"
                  step="0.01"
                />
              </div>
            )}

            {settings.withdrawal_mode === 'manual' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Manual Withdrawal Amount ($)
                </label>
                <input
                  type="number"
                  value={settings.manual_withdrawal_amount}
                  onChange={(e) => setSettings({ ...settings, manual_withdrawal_amount: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Wallet Settings */}
        <Card title="Wallet Settings">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Profit Withdrawal Address
              </label>
              <input
                type="text"
                value={settings.profit_withdrawal_address || ''}
                onChange={(e) => setSettings({ ...settings, profit_withdrawal_address: e.target.value })}
                placeholder="0x..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <p className="text-sm text-gray-400 mt-1">
                Leave empty to use default address from Secret Manager
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => updateSettings(settings)}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md font-medium"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default Settings;