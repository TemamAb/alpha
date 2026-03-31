import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { WagmiProvider } from 'wagmi'
import { polygonMumbai, polygon } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig, http } from 'viem'
import { injected, walletConnect } from 'wagmi/connectors'

const queryClient = new QueryClient()

const config = createConfig({
  chains: [polygonMumbai, polygon],
  connectors: [
    injected(),
    walletConnect({ projectId: process.env.VITE_WALLET_CONNECT_PROJECT_ID as `0x${string}` })
  ],
  transports: {
    [polygonMumbai.id]: http(),
    [polygon.id]: http()
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)

