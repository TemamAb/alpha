import { useState, useEffect } from 'react'
import { ConnectButton, useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseEther } from 'viem'
import { polygonMumbai } from 'wagmi/chains'
import { Button } from './components/ui/button' // Mock

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
  }
] as const

const CONTRACT_ADDRESS = '0xYourDeployedAddress' // Update after deploy

function App() {
  const { address, isConnected } = useAccount()
  const [flashAmount, setFlashAmount] = useState('')
  const { writeContract } = useWriteContract()

  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    functionName: 'owner',
    chainId: polygonMumbai.id
  })

  const handleTriggerArb = () => {
    writeContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: CONTRACT_ABI,
      functionName: 'startFlashLoan',
      args: ['0xA1DabEFa748F2aD4BC644d26D6c474837b0A8B6', parseEther(flashAmount || '1')]
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 p-8">
      <header className="max-w-6xl mx-auto mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">Aave V3 FlashLoan Arb Dashboard</h1>
        <ConnectButton />
      </header>
      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Contract Status</h2>
          <p>Owner: {owner || 'Loading...'}</p>
          <p>Connected: {isConnected ? address?.slice(0,6) + '...' : 'No'}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20 col-span-1 md:col-span-2">
          <h2 className="text-2xl font-bold text-white mb-4">Trigger Arb</h2>
          <input 
            type="number" 
            placeholder="Flash amount USDC.e" 
            value={flashAmount}
            onChange={(e) => setFlashAmount(e.target.value)}
            className="w-full p-3 bg-white/20 rounded-xl text-white placeholder-white/50 mb-4"
          />
          <Button onClick={handleTriggerArb} disabled={!isConnected || !flashAmount}>
            Execute Flash Loan Arb
          </Button>
        </div>
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">P&L</h2>
          <p className="text-3xl font-bold text-green-400">$1,234.56</p>
          <p className="text-green-400">+12.3% today</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Bot Status</h2>
          <p className="text-xl">Running</p>
          <Button>Toggle Bot</Button>
        </div>
      </main>
    </div>
  )
}

export default App

