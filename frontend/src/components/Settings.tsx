import React, { useState, useEffect, useRef } from 'react';
import { Save, RotateCcw, Wifi, Bell, Sliders, Shield, Key, Lock, Unlock, Upload, Download, AlertTriangle, CheckCircle, XCircle, Plus, Edit2, Trash2, Send, Wallet, DollarSign, RefreshCw } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface WalletData {
  id: number;
  address: string;
  accountName: string;
  logo: string;
  status: 'valid' | 'invalid' | 'verifying';
  balance: number;
  lastUpdated: number;
  network: 'ethereum' | 'polygon' | 'arbitrum';
}

interface TransferRequest {
  id: string;
  amount: number;
  fromWallet: string;
  toWallet: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: number;
  txHash?: string;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  ipWhitelist: string[];
  maxTransferAmount: number;
  requireApproval: boolean;
}

const Settings: React.FC = () => {
  // WebSocket Configuration
  const [wsUrl, setWsUrl] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Wallet Management
  const [wallets, setWallets] = useState<WalletData[]>([
    {
      id: 1,
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f7E679',
      accountName: 'Main Treasury',
      logo: 'MetaMask',
      status: 'valid',
      balance: 125.45,
      lastUpdated: Date.now(),
      network: 'ethereum'
                onChange={(e) => setWsUrl(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white focus:border-blue-500 focus:outline-none font-mono"
                placeholder="ws://localhost:3000/ws"
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Endpoint for real-time profit drops and telemetry. Changes require a reload.
              </p>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-black/40 p-6 rounded border border-gray-700">
          <h3 className="text-sm font-semibold mb-4 text-gray-200 flex items-center gap-2">
            <Bell size={16} />
            Dashboard Preferences
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-sm text-gray-300">Desktop Notifications</span>
              <span className="text-xs text-gray-500">Alert on high-value profit drops (> $1000)</span>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative ${
                notifications ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <div
                className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 absolute top-1 left-1 ${
                  notifications ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
          >
            <Save size={16} />
            Save & Reload
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded text-sm font-bold transition-colors"
          >
            <RotateCcw size={16} />
            Reset Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;