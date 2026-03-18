import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const ProfitFeed: React.FC = () => {
  const [feed, setFeed] = useState<string[]>([
    '[SYSTEM] Alpha-Orion v2.5.1 Initialized.',
    '[SYSTEM] Connecting to Polygon zkEVM RPC...',
    '[SYSTEM] Pimlico Paymaster connection successful. Gasless trading enabled.',
    '[SYSTEM] Scanning 50+ DEX pairs for arbitrage opportunities...',
  ]);
  const feedEndRef = useRef<null | HTMLDivElement>(null);
  const { isConnected, lastMessage } = useWebSocket();
  const wasConnected = useRef(false);

  const scrollToBottom = () => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [feed]);

  useEffect(() => {
    if (isConnected) {
      wasConnected.current = true;
      setFeed(prev => [...prev, '[SYSTEM] Connected to Alpha-Orion Real-time Stream.']);
    } else if (wasConnected.current) {
      setFeed(prev => [...prev, '[SYSTEM] Connection lost.']);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!lastMessage) return;

    const { type, payload, timestamp } = lastMessage;
    const timeStr = new Date(timestamp).toLocaleTimeString();

    let newLines: string[] = [];

    switch (type) {
      case 'PROFIT_DROP':
        newLines = [
          `🚀 PROFIT DROPPED: +$${payload.profit.toFixed(2)} | Pair: ${payload.pair}`,
          `   Strategy: ${payload.strategy} | Time: ${timeStr}`,
        ];
        break;
      case 'CONFIRMATION':
        newLines = [
          `💚 PROFIT CONFIRMED | Tx: ${payload.txHash.slice(0, 14)}...`,
          `   Block: ${payload.blockNumber} | Status: ${payload.status}`,
        ];
        break;
      case 'WITHDRAWAL':
        newLines = [`💸 AUTO-WITHDRAWAL | Amount: $${payload.amount} to treasury.`];
        break;
      case 'SYSTEM':
        newLines = [`[SYSTEM] ${payload.message}`];
        break;
    }

    if (newLines.length > 0) {
      setFeed(prev => [...prev, ...newLines]);
    }
  }, [lastMessage]);

  return (
    <div className="flex-grow bg-black/50 p-6 rounded-lg border border-gray-800 font-mono text-xs text-gray-300 overflow-y-auto shadow-inner">
      {feed.map((line, index) => (
        <div key={index} className="whitespace-pre-wrap leading-relaxed">
          {line.startsWith('🚀') && <span className="text-green-400">{line}</span>}
          {line.startsWith('💚') && <span className="text-cyan-400">{line}</span>}
          {line.startsWith('💸') && <span className="text-yellow-400">{line}</span>}
          {line.startsWith('[SYSTEM]') && <span className="text-gray-500">{line}</span>}
          {!line.startsWith('🚀') && !line.startsWith('💚') && !line.startsWith('💸') && !line.startsWith('[SYSTEM]') && <span>{line}</span>}
        </div>
      ))}
      <div ref={feedEndRef} />
    </div>
  );
};

export default ProfitFeed;