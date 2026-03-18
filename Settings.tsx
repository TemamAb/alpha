import React, { useState } from 'react';
import { ethers } from 'ethers';
import { Save, Shield, Key, Zap, AlertTriangle, CheckCircle2, Volume2, Gauge, Wallet, ArrowRight, Loader, X, RefreshCw } from 'lucide-react';

interface SettingsProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

const SettingsComponent: React.FC<SettingsProps> = ({ volume, onVolumeChange }) => {
  const [apiKey, setApiKey] = useState('sk_live_51Mz...');
  const [rpcUrl, setRpcUrl] = useState('https://eth-mainnet.g.alchemy.com/v2/...');
  const [maxSlippage, setMaxSlippage] = useState(0.5);
  const [minProfit, setMinProfit] = useState(50);
  const [gasLimit, setGasLimit] = useState(500000);
  const [autoTrade, setAutoTrade] = useState(false);
  const [saved, setSaved] = useState(false);
  const [capitalVelocity, setCapitalVelocity] = useState(80);
  const [reinvestmentRate, setReinvestmentRate] = useState(50);
  
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFrom, setTransferFrom] = useState('Execution Hot Wallet');
  const [transferTo, setTransferTo] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [wallets, setWallets] = useState([
    { id: 1, name: 'Main Treasury', address: '0x742d...E679', balance: '125.45 ETH', status: 'Active' },
    { id: 2, name: 'Execution Hot Wallet', address: '0x1234...5678', balance: '5.20 ETH', status: 'Active' },
    { id: 3, name: 'Cold Storage', address: '0x9876...4321', balance: '1050.00 ETH', status: 'Inactive' },
  ]);

  const handleSave = () => {
    // Simulate API call
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTransfer = () => {
    setIsTransferring(true);
    setTimeout(() => {
      setIsTransferring(false);
      setShowTransferModal(false);
      setToastMessage(`Successfully transferred ${transferAmount} ETH to ${transferTo}`);
      setShowToast(true);
      setTransferAmount('');
      setTimeout(() => setShowToast(false), 5000);
    }, 2000);
  };

  const fetchBalances = async () => {
    setIsLoadingBalances(true);
    try {
      // Use the configured RPC URL
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      const updatedWallets = await Promise.all(wallets.map(async (wallet) => {
        // Only attempt to fetch if address looks valid (skipping placeholders)
        if (ethers.isAddress(wallet.address)) {
          try {
            const balanceWei = await provider.getBalance(wallet.address);
            const balanceEth = ethers.formatEther(balanceWei);
            return { ...wallet, balance: `${parseFloat(balanceEth).toFixed(4)} ETH` };
          } catch (e) {
            console.error(`Failed to fetch balance for ${wallet.address}`, e);
          }
        }
        return wallet;
      }));
      
      setWallets(updatedWallets);
    } catch (error) {
      console.error('Failed to initialize provider:', error);
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const handleMaxClick = () => {
    const selectedWallet = wallets.find(w => w.name === transferFrom);
    if (selectedWallet) {
      const amount = selectedWallet.balance.replace(' ETH', '').replace(',', '');
      setTransferAmount(amount);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield className="text-blue-500" size={32} />
            System Configuration
          </h2>
          <p className="text-slate-400 mt-1">Manage API keys, risk parameters, and execution limits.</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
            saved 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
          }`}
        >
          {saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
          <span>{saved ? 'Changes Saved' : 'Save Changes'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Configuration */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Key size={20} className="text-amber-400" />
            API Credentials
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Alpha Orion API Key</label>
              <div className="relative">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">RPC Endpoint URL</label>
              <input
                type="text"
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Risk Parameters */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-400" />
            Risk Management
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Max Slippage Tolerance</span>
                <span className="text-slate-200 font-mono">{maxSlippage}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={maxSlippage}
                onChange={(e) => setMaxSlippage(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>0.1%</span>
                <span>5.0%</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Min Profit Threshold (USD)</span>
                <span className="text-slate-200 font-mono">${minProfit}</span>
              </div>
              <input
                type="range"
                min="10"
                max="1000"
                step="10"
                value={minProfit}
                onChange={(e) => setMinProfit(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>$10</span>
                <span>$1000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Parameters (Transferred from Legacy Dashboard) */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Gauge size={20} className="text-cyan-400" />
            Strategy Parameters
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Capital Velocity</span>
                <span className="text-slate-200 font-mono">{capitalVelocity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={capitalVelocity}
                onChange={(e) => setCapitalVelocity(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Reinvestment Rate</span>
                <span className="text-slate-200 font-mono">{reinvestmentRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={reinvestmentRate}
                onChange={(e) => setReinvestmentRate(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Sound Configuration */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Volume2 size={20} className="text-emerald-400" />
            Sound Configuration
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">System Notification Volume</span>
                <span className="text-slate-200 font-mono">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Execution Settings */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Zap size={20} className="text-purple-400" />
            Execution Limits
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Gas Limit (Units)</label>
              <input
                type="number"
                value={gasLimit}
                onChange={(e) => setGasLimit(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-4">
              <div>
                <div className="text-slate-200 font-medium">Auto-Trading Mode</div>
                <div className="text-xs text-slate-500">Automatically execute profitable trades</div>
              </div>
              <button
                onClick={() => setAutoTrade(!autoTrade)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  autoTrade ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoTrade ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Wallet Management & Profit Transfer */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Wallet size={20} className="text-emerald-400" />
              Wallet Management & Profit Transfer
            </h3>
            <button 
              onClick={fetchBalances}
              disabled={isLoadingBalances}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
              title="Refresh Balances"
            >
              <RefreshCw size={16} className={isLoadingBalances ? "animate-spin" : ""} />
            </button>
          </div>
          
          {/* Wallet Table */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm text-left text-slate-400">
              <thead className="text-xs text-slate-500 uppercase bg-slate-950/50">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Wallet Name</th>
                  <th className="px-4 py-3">Address</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3 rounded-r-lg">Status</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((wallet) => (
                  <tr key={wallet.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200">{wallet.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{wallet.address}</td>
                    <td className="px-4 py-3 text-emerald-400 font-mono">{wallet.balance}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold ${
                        wallet.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-500'
                      }`}>
                        {wallet.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Profit Transfer */}
          <div className="bg-slate-950/50 rounded-xl p-6 border border-slate-800">
            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Initiate Profit Transfer</h4>
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">From</label>
                <select 
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option>Execution Hot Wallet</option>
                  <option>Main Treasury</option>
                </select>
              </div>
              <div className="flex justify-center md:pb-2 md:col-span-1">
                <ArrowRight className="text-slate-600" size={20} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">To Address</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="0x..."
                    className={`w-full bg-slate-900 border rounded-lg px-3 py-2 text-slate-300 text-sm focus:outline-none font-mono ${
                      transferTo && !ethers.isAddress(transferTo) 
                        ? 'border-red-500 focus:border-red-500' 
                        : 'border-slate-700 focus:border-blue-500'
                    }`}
                  />
                  {transferTo && ethers.isAddress(transferTo) && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                  )}
                </div>
                {transferTo && !ethers.isAddress(transferTo) && (
                  <p className="text-[10px] text-red-400 mt-1">Invalid Ethereum address</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-500 mb-1">Amount (ETH)</label>
                <div className="flex gap-2">
                    <div className="relative w-full">
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-3 pr-12 py-2 text-slate-300 text-sm focus:outline-none focus:border-blue-500 font-mono" 
                      />
                      <button
                        onClick={handleMaxClick}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-2 py-1 rounded transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                    <button 
                      onClick={() => setShowTransferModal(true)}
                      disabled={!transferAmount || parseFloat(transferAmount) <= 0 || !ethers.isAddress(transferTo)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-blue-500/20 whitespace-nowrap"
                    >
                        Send
                    </button>
                </div>
              </div>
            </div>
          </div>

          {/* Transfer Confirmation Modal */}
          {showTransferModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 mb-4 text-blue-400">
                  <Wallet size={24} />
                  <h3 className="text-lg font-bold text-white">Confirm Transfer</h3>
                </div>
                
                <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 mb-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">From</span>
                    <span className="text-slate-300">{transferFrom}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">To</span>
                    <span className="text-slate-300">{transferTo}</span>
                  </div>
                  <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                    <span className="text-slate-500">Amount</span>
                    <span className="text-xl font-mono font-bold text-white">{transferAmount || '0.00'} ETH</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTransferModal(false)}
                    className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTransfer}
                    disabled={isTransferring}
                    className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    {isTransferring ? (
                      <>
                        <Loader className="animate-spin" size={18} />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Confirm Send</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Toast Notification */}
          {showToast && (
            <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <div className="bg-slate-900/90 border border-emerald-500/30 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-500/10 flex items-center gap-4">
                <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-400">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-400">Transfer Successful</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{toastMessage}</p>
                </div>
                <button onClick={() => setShowToast(false)} className="ml-2 text-slate-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsComponent;
