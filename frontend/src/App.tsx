import { useState, useEffect, useCallback } from 'react'
import { ConnectButton, useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther, formatUnits } from 'viem'
import { polygonMumbai } from 'wagmi/chains'
import { Button } from './components/ui/button' // Mock

const CONTRACT_ADDRESS = '0xYourDeployedAddress' // Update
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
const ETH_PRICE_USD = 2500 // Approx, fetch from API for production
const AUTO_WITHDRAW_THRESHOLD_USDC = 25 * 1e6 // 0.01 ETH ~ $25 USDC (6 dec)

const CONTRACT_ABI = [
  {
    "inputs": [{"name": "asset", "type": "address"}, {"name": "amount", "type": "uint256"}],
    "name": "startFlashLoan",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "asset", "type": "address"}],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getProfitBalance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

function App() {
  const { address, isConnected } = useAccount()
  const [flashAmount, setFlashAmount] = useState('')
  const [autoWithdraw, setAutoWithdraw] = useState(false)
  const { writeContract } = useWriteContract()
  const [profitETH, setProfitETH] = useState(0)
  const [lastWithdrawTx, setLastWithdrawTx] = useState('')

  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'owner',
    chainId: polygonMumbai.id
  })

  const { data: rawProfit } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'getProfitBalance',
    chainId: polygonMumbai.id
  })

  const { isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({
    hash: lastWithdrawTx as `0x${string}`
  })

  useEffect(() => {
    if (rawProfit) {
      const usdBalance = Number(formatUnits(rawProfit as bigint, 6))
      const ethEquiv = usdBalance / ETH_PRICE_USD
      setProfitETH(ethEquiv)
    }
  }, [rawProfit])

  // Auto withdrawal logic
  useEffect(() => {
    if (autoWithdraw && isConnected && profitETH > 0.01) {
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'withdraw',
        args: [USDC_ADDRESS]
      }).then(tx => setLastWithdrawTx(tx as string))
    }
  }, [profitETH, autoWithdraw, isConnected, writeContract])

  const handleManualWithdraw = () => {
    const tx = writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'withdraw',
      args: [USDC_ADDRESS]
    })
    setLastWithdrawTx(tx as string)
  }

  const handleTriggerArb = () => {
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'startFlashLoan',
      args: [USDC_ADDRESS, parseEther(flashAmount || '1')]
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-8">
      <header className="max-w-6xl mx-auto mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">Aave V3 Flash Arb Dashboard</h1>
        <ConnectButton />
      </header>
      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Profit Balance</h2>
          <p className="text-4xl font-bold text-green-400">{profitETH.toFixed(4)} ETH</p>
          <p className="text-sm opacity-75">~${(profitETH * ETH_PRICE_USD).toFixed(2)}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Withdrawal</h2>
          <label className="flex items-center mb-4">
            <input 
              type="checkbox" 
              checked={autoWithdraw}
              onChange={(e) => setAutoWithdraw(e.target.checked)}
              className="mr-2 w-5 h-5"
            />
            Auto (>0.01 ETH)
          </label>
          <Button onClick={handleManualWithdraw} disabled={!isConnected || profitETH === 0} className="w-full">
            Manual Withdraw All
          </Button>
          {withdrawSuccess && <p className="text-green-400 mt-2">Withdrawn!</p>}
        </div>
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20 col-span-1 md:col-span-2">
          <h2 className="text-2xl font-bold text-white mb-4">Manual Arb</h2>
          <input 
            type="number" 
            placeholder="Amount ETH equiv" 
            value={flashAmount}
            onChange={(e) => setFlashAmount(e.target.value)}
            className="w-full p-3 bg-white/20 rounded-xl text-white placeholder-white/50 mb-4"
          />
          <Button onClick={handleTriggerArb} disabled={!isConnected || !flashAmount} className="w-full">
            Execute Arb
          </Button>
        </div>
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Status</h2>
          <p>Owner: {owner ? (owner as `0x${string}`).slice(0,6)+'...' : 'Loading'}</p>
          <p>Connected: {isConnected ? address?.slice(0,6)+'...' : 'No'}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Daily P&L</h2>
          <p className="text-3xl font-bold text-green-400">+0.05 ETH</p>
        </div>
      </main>
    </div>
  )
}

export default App

