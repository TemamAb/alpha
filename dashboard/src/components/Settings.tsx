import React, { useState, useRef } from 'react';
import { Settings as SettingsIcon, Plus, Upload, Trash2, Edit2, Check, X, Wallet, Search, ChevronDown, ChevronUp, Lock, Unlock } from 'lucide-react';
import { useCurrency, useWallets, useAlphaOrionStore, useDepositMode, useDepositThreshold, WalletData } from '../hooks/useAlphaOrionStore';

const Settings: React.FC = () => {
  const currency = useCurrency();
  const wallets = useWallets();
  const { setWallets, addWallet, removeWallet, updateWallet, setDepositMode, setDepositThreshold } = useAlphaOrionStore();
  const depositMode = useDepositMode();
  const depositThreshold = useDepositThreshold();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ accountName: '', address: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWallet, setNewWallet] = useState({ accountName: '', address: '' });
  const [isLocked, setIsLocked] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatBalance = (balance: number) => {
    const symbol = currency === 'ETH' ? 'Ξ' : '$';
    const formatted = balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${symbol}${formatted}`;
  };

  const getWalletLogo = (logo: string) => {
    const logos: Record<string, string> = {
      'MetaMask': '🦊',
      'WalletConnect': '🔗',
      'Ledger': '📀',
      'TrustWallet': '🔐',
      'Coinbase': '💰',
    };
    return logos[logo] || '👛';
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileContent = await file.text();
      let newWallets: WalletData[] = [];

      if (file.name.endsWith('.csv')) {
        const lines = fileContent.split('\n').filter(line => line.trim());
        const dataLines = lines[0].toLowerCase().includes('address') ? lines.slice(1) : lines;
        
        newWallets = dataLines.map((line, index) => {
          const [address, accountName] = line.split(',').map(s => s.trim());
          return {
            id: Date.now() + index,
            address: address?.startsWith('0x') ? address : '0x' + address,
            accountName: accountName || `Wallet ${index + 1}`,
            logo: 'MetaMask',
            status: 'valid' as const,
            balance: 0,
          };
        });
      } 
      else if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(fileContent);
          newWallets = Array.isArray(parsed) ? parsed.map((item: any, index: number) => ({
            id: Date.now() + index,
            address: item.address?.startsWith('0x') ? item.address : '0x' + item.address,
            accountName: item.accountName || item.name || `Wallet ${index + 1}`,
            logo: item.logo || 'MetaMask',
            status: item.status || 'valid' as const,
            balance: item.balance || 0,
          })) : [];
        } catch {
          const item = JSON.parse(fileContent);
          newWallets = [{
            id: Date.now(),
            address: item.address?.startsWith('0x') ? item.address : '0x' + item.address,
            accountName: item.accountName || item.name || 'Wallet 1',
            logo: item.logo || 'MetaMask',
            status: item.status || 'valid' as const,
            balance: item.balance || 0,
          }];
        }
      }
      else {
        const addresses = fileContent.split('\n').filter(line => line.trim());
        newWallets = addresses.map((address, index) => ({
          id: Date.now() + index,
          address: address.trim().startsWith('0x') ? address.trim() : '0x' + address.trim(),
          accountName: `Wallet ${index + 1}`,
          logo: 'MetaMask',
          status: 'valid' as const,
          balance: 0,
        }));
      }

      const totalWallets = newWallets.length;
      const progressStep = Math.max(5, 100 / Math.min(totalWallets, 20));
      
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            setWallets([...wallets, ...newWallets]);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            return 100;
          }
          return Math.min(prev + progressStep, 100);
        });
      }, 50);
    } catch (error) {
      console.error('Error parsing file:', error);
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = (id: number) => {
    removeWallet(id);
  };

  const handleEdit = (wallet: WalletData) => {
    setEditingId(wallet.id);
    setEditForm({ accountName: wallet.accountName, address: wallet.address });
  };

  const handleSaveEdit = (id: number) => {
    updateWallet(id, editForm);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ accountName: '', address: '' });
  };

  const handleAddWallet = () => {
    if (newWallet.address && newWallet.accountName) {
      const wallet: WalletData = {
        id: Date.now(),
        address: newWallet.address.startsWith('0x') ? newWallet.address : '0x' + newWallet.address,
        accountName: newWallet.accountName,
        logo: 'MetaMask',
        status: 'valid',
        balance: 0,
      };
      
      addWallet(wallet);
      setNewWallet({ accountName: '', address: '' });
      setShowAddModal(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">
            {currency === 'ETH' ? 'Ξ' : '$'} Profit Withdrawal
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage withdrawal wallets and accounts</p>
        </div>
      </div>

      {/* Auto/Manual Transfer Section */}
      <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-[0.3em]">Auto Transfer</h3>
            <span className={`px-2 py-1 rounded text-[8px] font-medium uppercase ${
              depositMode === 'auto' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : 'bg-slate-700/50 text-slate-400'
            }`}>
              {depositMode.toUpperCase()}
            </span>
          </div>
          <button
            onClick={() => setDepositMode(depositMode === 'auto' ? 'manual' : 'auto')}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all ${
              depositMode === 'auto'
                ? 'bg-emerald-600/20 border-emerald-500/50 hover:bg-emerald-600/30'
                : 'bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/30'
            }`}
          >
            <span className={`text-xs font-medium ${depositMode === 'auto' ? 'text-emerald-400' : 'text-blue-400'}`}>
              {depositMode === 'auto' ? 'SWITCH TO MANUAL' : 'SWITCH TO AUTO'}
            </span>
          </button>
        </div>

        {depositMode === 'auto' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/30 rounded-xl p-4">
              <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest mb-2">Threshold ({currency === 'ETH' ? 'ETH' : 'USD'})</p>
              <div className="flex items-center gap-2">
                <span className="text-lg text-emerald-400 font-light">{formatBalance(depositThreshold)}</span>
                <span className="text-xs text-slate-500">per wallet</span>
              </div>
              <input
                type="range"
                min="100"
                max="10000"
                step="100"
                value={depositThreshold}
                onChange={(e) => setDepositThreshold(Number(e.target.value))}
                className="w-full mt-3 accent-emerald-500"
              />
              <div className="flex justify-between text-[8px] text-slate-500 mt-1">
                <span>$100</span>
                <span>$10,000</span>
              </div>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-4">
              <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest mb-2">Last Auto Transfer</p>
              <p className="text-sm text-slate-300 font-light">--</p>
              <p className="text-xs text-slate-500 mt-1 font-light">No transfers yet</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[8px] font-medium text-slate-400 uppercase tracking-widest mb-2">
                  Transfer Amount ({currency === 'ETH' ? 'ETH' : 'USD'})
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none transition-all font-light"
                />
              </div>
              <div>
                <label className="block text-[8px] font-medium text-slate-400 uppercase tracking-widest mb-2">
                  Destination Wallet
                </label>
                <select className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500/50 outline-none transition-all font-light">
                  <option value="" className="bg-slate-900">Select wallet</option>
                  {wallets.map(wallet => (
                    <option key={wallet.id} value={wallet.address} className="bg-slate-900">
                      {wallet.accountName} - {formatAddress(wallet.address)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all">
                <span className="text-xs font-medium text-white">Execute Transfer</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Table */}
      <div className={`bg-slate-900/40 border border-white/10 rounded-3xl backdrop-blur-xl shadow-2xl ${isLocked ? 'opacity-75' : ''}`}>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-[0.3em]">Withdrawal Wallets</h3>
            <span className={`px-2 py-1 rounded text-[8px] font-bold uppercase ${isLocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {isLocked ? 'LOCKED' : 'UNLOCKED'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Total Balance - compact style like profit pulse */}
            <div className="text-right">
              <p className="text-[8px] font-light text-slate-400 uppercase tracking-widest">Total</p>
              <p className="text-lg font-thin text-emerald-400 tabular-nums tracking-wide">{formatBalance(totalBalance)}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 rounded-lg transition-all"
              >
                {isExpanded ? (
                  <ChevronUp size={14} className="text-slate-400" />
                ) : (
                  <ChevronDown size={14} className="text-slate-400" />
                )}
                <span className="text-xs font-bold text-slate-300">
                  {isExpanded ? 'COLLAPSE' : 'EXPAND'}
                </span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUpload}
                accept=".csv,.json,.txt"
                className="hidden"
                disabled={isLocked}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isLocked}
                className={`flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 rounded-lg transition-all ${isLocked ? 'disabled:opacity-30 cursor-not-allowed' : ''}`}
              >
                <Upload size={14} className={isLocked ? 'text-slate-500' : 'text-blue-400'} />
                <span className={`text-xs font-bold ${isLocked ? 'text-slate-500' : 'text-slate-300'}`}>
                  {isUploading ? `Importing... ${uploadProgress}%` : 'Upload'}
                </span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                disabled={isLocked}
                className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all ${isLocked ? 'disabled:opacity-30 cursor-not-allowed' : ''}`}
              >
                <Plus size={14} className={isLocked ? 'text-slate-500' : 'text-white'} />
                <span className={`text-xs font-bold ${isLocked ? 'text-slate-500' : 'text-white'}`}>Add Wallet</span>
              </button>
              <button
                onClick={() => setIsLocked(!isLocked)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-all ${
                  isLocked 
                    ? 'bg-emerald-600/20 border-emerald-500/50 hover:bg-emerald-600/30' 
                    : 'bg-red-600/20 border-red-500/50 hover:bg-red-600/30'
                }`}
              >
                {isLocked ? <Unlock size={14} className="text-emerald-400" /> : <Lock size={14} className="text-red-400" />}
                <span className={`text-xs font-bold ${isLocked ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isLocked ? 'UNLOCK' : 'LOCK'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {isExpanded ? (
          <div className="p-6">
            {isUploading && (
              <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-blue-400">Importing wallets...</span>
                  <span className="text-xs font-bold text-blue-400">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden mt-2">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-100"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {wallets.length > 0 ? (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse sticky top-0">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">No</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">Wallet Address</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">Account Name</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">Logo</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">Status</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">Balance</th>
                      <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {wallets.map((wallet, index) => (
                      <tr key={wallet.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-4 text-sm font-bold text-slate-400">{index + 1}</td>
                        <td className="px-4 py-4">
                          {editingId === wallet.id ? (
                            <input
                              type="text"
                              value={editForm.address}
                              onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                              disabled={isLocked}
                              className="w-full bg-slate-800 border border-blue-500/50 rounded px-2 py-1 text-xs text-white disabled:opacity-50"
                            />
                          ) : (
                            <span className="text-sm font-mono text-slate-300">{formatAddress(wallet.address)}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {editingId === wallet.id ? (
                            <input
                              type="text"
                              value={editForm.accountName}
                              onChange={(e) => setEditForm(prev => ({ ...prev, accountName: e.target.value }))}
                              disabled={isLocked}
                              className="w-full bg-slate-800 border border-blue-500/50 rounded px-2 py-1 text-xs text-white disabled:opacity-50"
                            />
                          ) : (
                            <span className="text-sm font-bold text-white">{wallet.accountName}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getWalletLogo(wallet.logo)}</span>
                            <span className="text-xs text-slate-400">{wallet.logo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            wallet.status === 'valid' 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {wallet.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-thin text-emerald-400 tabular-nums tracking-wide">{formatBalance(wallet.balance)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {editingId === wallet.id ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(wallet.id)}
                                  disabled={isLocked}
                                  className={`p-2 bg-emerald-600/20 hover:bg-emerald-600/40 rounded-lg transition-all ${isLocked ? 'disabled:opacity-30 cursor-not-allowed' : ''}`}
                                >
                                  <Check size={14} className="text-emerald-400" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={isLocked}
                                  className={`p-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition-all ${isLocked ? 'disabled:opacity-30 cursor-not-allowed' : ''}`}
                                >
                                  <X size={14} className="text-red-400" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEdit(wallet)}
                                  disabled={isLocked}
                                  className={`p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all ${isLocked ? 'disabled:opacity-30 cursor-not-allowed' : ''}`}
                                >
                                  <Edit2 size={14} className={isLocked ? 'text-slate-500' : 'text-blue-400'} />
                                </button>
                                <button
                                  onClick={() => handleDelete(wallet.id)}
                                  disabled={isLocked}
                                  className={`p-2 bg-slate-800/50 hover:bg-red-600/40 rounded-lg transition-all ${isLocked ? 'disabled:opacity-30 cursor-not-allowed' : ''}`}
                                >
                                  <Trash2 size={14} className={isLocked ? 'text-slate-500' : 'text-red-400'} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Wallet size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-sm">No wallets configured</p>
                <p className="text-xs text-slate-500 mt-1">Upload a file or add wallets manually</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">No</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">Wallet Address</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">Account Name</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">Logo</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">Status</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">Balance</th>
                    <th className="px-4 py-3 text-[9px] font-black text-slate-200 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-4 text-sm font-bold text-slate-400">--</td>
                    <td className="px-4 py-4 text-sm font-mono text-slate-300">--</td>
                    <td className="px-4 py-4 text-sm font-bold text-white">TOTAL SUMMARY</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💰</span>
                        <span className="text-xs text-slate-400">Summary</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-blue-500/20 text-blue-400">
                        SUMMARY
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-thin text-emerald-400 tabular-nums tracking-wide">{formatBalance(totalBalance)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-slate-500">({wallets.length} wallets)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Wallet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md backdrop-blur-xl shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Add New Wallet</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-all"
              >
                <X size={14} className="text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[8px] font-medium text-slate-400 uppercase tracking-widest mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={newWallet.address}
                  onChange={(e) => setNewWallet(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="0x..."
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-[8px] font-medium text-slate-400 uppercase tracking-widest mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  value={newWallet.accountName}
                  onChange={(e) => setNewWallet(prev => ({ ...prev, accountName: e.target.value }))}
                  placeholder="My Wallet"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-white/10 rounded-lg transition-all"
                >
                  <span className="text-xs font-bold text-slate-300">Cancel</span>
                </button>
                <button
                  onClick={handleAddWallet}
                  disabled={!newWallet.address || !newWallet.accountName}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} className="text-white" />
                  <span className="text-xs font-bold text-white">Add Wallet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
