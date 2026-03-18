import React, { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { PiggyBank, Search, Loader, AlertTriangle, Wallet } from 'lucide-react';

const TreasuryPage = () => {
    const [address, setAddress] = useState('');
    const [balance, setBalance] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = useCallback(async () => {
        if (!ethers.isAddress(address)) {
            setError('Please enter a valid Ethereum address.');
            setBalance(null);
            return;
        }

        setIsLoading(true);
        setError(null);
        setBalance(null);

        try {
            // Using a public RPC for this example. In the full app, this should use
            // the configured provider from `import.meta.env.VITE_RPC_URL`.
            const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
            const balanceWei = await provider.getBalance(address);
            const balanceEth = ethers.formatEther(balanceWei);
            setBalance(balanceEth);
        } catch (e) {
            console.error('Failed to fetch balance:', e);
            setError('Failed to fetch balance. Check the console and ensure the address is correct.');
        } finally {
            setIsLoading(false);
        }
    }, [address]);

    return (
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl max-w-2xl mx-auto my-10">
            <div className="flex items-center gap-3 mb-4">
                <PiggyBank className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-semibold text-white">Treasury Balance Checker</h2>
            </div>
            <p className="text-sm text-gray-400 mb-6">
                Enter the address of the Treasury smart contract to view its current ETH balance.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="0x..."
                    className="flex-grow bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm font-mono text-gray-300 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <button
                    onClick={fetchBalance}
                    disabled={isLoading || !address}
                    className="w-full sm:w-auto py-3 px-6 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Loader className="w-4 h-4 animate-spin" />
                            <span>Fetching...</span>
                        </>
                    ) : (
                        <>
                            <Search className="w-4 h-4" />
                            <span>Get Balance</span>
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div className="mt-6 bg-red-900/20 border border-red-500/50 p-4 rounded-xl flex gap-3 text-sm">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-red-400">Error</h3>
                        <p className="text-red-200 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {balance !== null && (
                <div className="mt-6 bg-gray-900 border border-green-500/30 p-6 rounded-xl animate-in fade-in duration-300">
                    <div className="flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-green-400" />
                        <div>
                            <p className="text-sm text-gray-400">Current Balance</p>
                            <p className="text-3xl font-bold text-white tracking-tight">
                                {parseFloat(balance).toFixed(6)} ETH
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TreasuryPage;